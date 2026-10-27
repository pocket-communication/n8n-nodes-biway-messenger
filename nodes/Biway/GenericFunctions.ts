import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { createHmac } from 'crypto';

import { describeBiwayError } from './ErrorMap';

export const DEFAULT_BASE_URL = 'https://services.bi-way.fr';

/**
 * Bi-Way lists resources with the non-standard HTTP verb COLLECTION. n8n passes the method
 * through to the HTTP client unchanged, only its TypeScript type is closed.
 */
export type BiwayMethod = IHttpRequestMethods | 'COLLECTION';

type BiwayContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

export type BiwayBody = IDataObject | IDataObject[] | FormData;

export interface BiwayResponse {
	statusCode: number;
	body: unknown;
	/** Error code of a Bi-Way error answer, empty when the call succeeded. */
	errorCode: string;
	errorMessage: string;
}

export async function getBaseUrl(this: BiwayContext): Promise<string> {
	const credentials = await this.getCredentials('biwayApi');
	const baseUrl = typeof credentials.baseUrl === 'string' ? credentials.baseUrl : '';
	return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function parseBody(body: unknown): unknown {
	if (typeof body !== 'string') {
		return body;
	}
	const trimmed = body.trim();
	if (trimmed === '') {
		return null;
	}
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed;
	}
}

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Bi-Way errors come as {type: 'error' | 'unauthorized', code, message}. Some errors carry bare
 * data instead: the HTTP status is then the only sign of failure.
 */
function readError(statusCode: number, body: unknown): { code: string; message: string } | null {
	if (isObject(body) && (body.type === 'error' || body.type === 'unauthorized')) {
		return {
			code: typeof body.code === 'string' ? body.code : '',
			message: typeof body.message === 'string' ? body.message : '',
		};
	}
	if (statusCode >= 400) {
		return { code: '', message: typeof body === 'string' ? body : JSON.stringify(body) };
	}
	return null;
}

/**
 * Calls Bi-Way and returns the answer, Bi-Way errors included. Network failures still throw.
 */
export async function biwayApiCall(
	this: BiwayContext,
	method: BiwayMethod,
	path: string,
	body?: BiwayBody,
	qs?: IDataObject,
	itemIndex?: number,
): Promise<BiwayResponse> {
	const isMultipart = body instanceof FormData;
	const options: IHttpRequestOptions = {
		method: method as IHttpRequestMethods,
		url: `${await getBaseUrl.call(this)}${path}`,
		json: !isMultipart,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (body !== undefined) {
		options.body = body;
	}
	if (qs !== undefined) {
		options.qs = qs;
	}

	let response: IN8nHttpFullResponse;
	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'biwayApi',
			options,
		)) as IN8nHttpFullResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
	}

	const responseBody = parseBody(response.body);
	const error = readError(response.statusCode, responseBody);
	return {
		statusCode: response.statusCode,
		body: responseBody,
		errorCode: error ? error.code || `http_${response.statusCode}` : '',
		errorMessage: error ? error.message : '',
	};
}

export function toBiwayError(
	this: BiwayContext,
	response: BiwayResponse,
	itemIndex?: number,
): NodeApiError {
	const { message, description } = describeBiwayError(response.errorCode, response.errorMessage);
	const errorResponse = isObject(response.body)
		? (response.body as JsonObject)
		: ({ message: response.errorMessage } as JsonObject);
	return new NodeApiError(this.getNode(), errorResponse, {
		message,
		description,
		httpCode: String(response.statusCode),
		itemIndex,
	});
}

/**
 * Calls Bi-Way and throws an explicit English error when Bi-Way refuses the request.
 */
export async function biwayApiRequest(
	this: BiwayContext,
	method: BiwayMethod,
	path: string,
	body?: BiwayBody,
	qs?: IDataObject,
	itemIndex?: number,
): Promise<unknown> {
	const response = await biwayApiCall.call(this, method, path, body, qs, itemIndex);
	if (response.errorCode) {
		throw toBiwayError.call(this, response, itemIndex);
	}
	return response.body;
}

/**
 * Bi-Way answers some creations with a bare id, and successes without data with an envelope.
 */
export function normalizeResponse(body: unknown, idField = 'id'): IDataObject {
	if (typeof body === 'number' || (typeof body === 'string' && /^\d+$/.test(body))) {
		return { [idField]: Number(body) };
	}
	if (isObject(body)) {
		if (
			body.type === 'success' &&
			Object.keys(body).every((key) => ['type', 'code', 'message'].includes(key))
		) {
			return { success: true };
		}
		return body;
	}
	if (Array.isArray(body)) {
		return { data: body as IDataObject[] };
	}
	return { success: true };
}

export function parseIdList(value: unknown): number[] {
	const raw = Array.isArray(value) ? value : String(value ?? '').split(/[\s,;]+/);
	return raw.map((id) => Number(String(id).trim())).filter((id) => Number.isInteger(id) && id > 0);
}

export function parseJsonParameter(value: unknown): IDataObject | IDataObject[] | undefined {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}
	if (typeof value === 'object') {
		return value as IDataObject | IDataObject[];
	}
	const parsed = JSON.parse(String(value)) as unknown;
	return typeof parsed === 'object' && parsed !== null
		? (parsed as IDataObject | IDataObject[])
		: undefined;
}

// ── Dates ────────────────────────────────────────────────────────────────────────────────────────

const BIWAY_TIME_ZONE = 'Europe/Paris';

function wallTimeParts(instant: number, timeZone: string): Record<string, number> {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant));
	const result: Record<string, number> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			result[part.type] = Number(part.value);
		}
	}
	return result;
}

/** Offset of a time zone at an instant, in milliseconds. */
function timeZoneOffset(instant: number, timeZone: string): number {
	const p = wallTimeParts(instant, timeZone);
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * Converts an n8n date (ISO, with or without offset; without offset it is read in the workflow
 * time zone) to the format Bi-Way expects: 'yyyy-MM-dd HH:mm' in Europe/Paris.
 * Returns null when the value is not a date.
 */
export function toBiwayDate(value: string, workflowTimeZone: string): string | null {
	const text = value.trim();
	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
		return text;
	}
	const match = text.match(
		/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/,
	);
	if (!match) {
		return null;
	}
	const [, year, month, day, hour, minute, second, offset] = match;
	const wallTimeAsUtc = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second ?? 0),
	);
	let instant: number;
	if (offset) {
		instant = Date.parse(text.replace(' ', 'T'));
	} else {
		const timeZone = workflowTimeZone || BIWAY_TIME_ZONE;
		// Two passes settle the offset around daylight saving changes.
		instant = wallTimeAsUtc - timeZoneOffset(wallTimeAsUtc, timeZone);
		instant = wallTimeAsUtc - timeZoneOffset(instant, timeZone);
	}
	if (Number.isNaN(instant)) {
		return null;
	}
	const p = wallTimeParts(instant, BIWAY_TIME_ZONE);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

// ── Webhook token ────────────────────────────────────────────────────────────────────────────────

/**
 * Bi-Way does not sign its calls. The trigger registers its URL with a token derived from the API
 * secret, and checks it on every call.
 */
export function webhookToken(secret: string, webhookId: string): string {
	return createHmac('sha256', secret).update(webhookId).digest('hex').slice(0, 32);
}

/** Constant-time comparison, so the token cannot be guessed character by character. */
export function sameToken(received: string, expected: string): boolean {
	if (received.length !== expected.length) {
		return false;
	}
	let difference = 0;
	for (let i = 0; i < expected.length; i++) {
		difference |= received.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return difference === 0;
}
