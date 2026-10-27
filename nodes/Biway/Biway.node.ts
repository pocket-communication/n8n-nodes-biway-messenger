import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { assetFields, assetOperations } from './descriptions/AssetDescription';
import { contactFields, contactOperations } from './descriptions/ContactDescription';
import { messageFields, messageOperations } from './descriptions/MessageDescription';
import { rcsFields, rcsOperations } from './descriptions/RcsDescription';
import { templateFields, templateOperations } from './descriptions/TemplateDescription';
import {
	biwayApiCall,
	biwayApiRequest,
	normalizeResponse,
	parseIdList,
	parseJsonParameter,
	toBiwayDate,
	toBiwayError,
} from './GenericFunctions';
import { getChannels, getContactGroups, getSenders, getTemplates } from './methods/loadOptions';

const ORIGINATED = 'n8n';
const RCS_DECLARATION_URL = 'https://app.bi-way.fr/rcs-registration/';
const RCS_SETTINGS_URL = 'https://v3.bi-way.fr/settings/chatbot';
const SUPPORT_EMAIL = 'tech@pocketcommunication.com';

type Handler = (this: IExecuteFunctions, i: number) => Promise<IDataObject>;

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────

function dateParameter(this: IExecuteFunctions, value: unknown, i: number, field: string): string {
	const date = toBiwayDate(String(value), this.getTimezone());
	if (date === null) {
		throw new NodeOperationError(this.getNode(), `The "${field}" value is not a valid date`, {
			itemIndex: i,
			description: 'Use a date and time, for example 2026-11-02T09:30.',
		});
	}
	return date;
}

function jsonParameter(
	this: IExecuteFunctions,
	value: unknown,
	i: number,
	field: string,
): IDataObject | IDataObject[] | undefined {
	try {
		return parseJsonParameter(value);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `The "${field}" field is not valid JSON`, {
			itemIndex: i,
			description: (error as Error).message,
		});
	}
}

/** Content (text or template) and options shared by Send and Broadcast. */
function messageContent(this: IExecuteFunctions, i: number, channel: string): IDataObject {
	const body: IDataObject = {};
	if (this.getNodeParameter('contentSource', i) === 'template') {
		body.template_id = Number(this.getNodeParameter('templateId', i));
	} else {
		const subject = this.getNodeParameter('subject', i, '') as string;
		if (subject) {
			body.subject = subject;
		}
		body.body = this.getNodeParameter('body', i) as string;
	}

	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	if (options.title) {
		body.title = options.title;
	}
	if (options.sender) {
		body.sender = { [channel]: { address: options.sender } };
	}
	if (options.skipAccountLayout === true) {
		body['no-template'] = true;
	}
	if (options.sendAt) {
		body.date = dateParameter.call(this, options.sendAt, i, 'Send At');
	}
	const extra = jsonParameter.call(this, options.extra, i, 'Extra (JSON)');
	if (extra && Object.keys(extra).length) {
		body.extra = extra;
	}
	return body;
}

// ── Message ──────────────────────────────────────────────────────────────────────────────────────

const sendMessage: Handler = async function (i) {
	const channel = this.getNodeParameter('channel', i) as string;
	const body: IDataObject = {
		channel,
		receiver: (this.getNodeParameter('receiver', i) as string).trim(),
		operation: 'notification',
		originated: ORIGINATED,
		...messageContent.call(this, i, channel),
	};
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const parts = parseIdList(options.assetIds);
	if (parts.length) {
		body.parts = parts;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/messenger/submit', body, undefined, i),
	);
};

function splitAddresses(value: unknown): string[] {
	const raw = Array.isArray(value) ? value : String(value ?? '').split(/[\n,;]+/);
	return raw.map((address) => String(address).trim()).filter(Boolean);
}

const broadcastMessage: Handler = async function (i) {
	const channel = this.getNodeParameter('channel', i) as string;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const recipients = this.getNodeParameter('recipients', i, {}) as {
		addresses?: Array<{ address?: string }>;
		contacts?: Array<{ contactId?: number }>;
		groups?: Array<{ groupId?: number | string }>;
	};

	// Typed addresses become temporary contacts: Bi-Way reads the column named by the key.
	const receivers: Array<IDataObject | string> = [];
	const addresses = [
		...(recipients.addresses ?? []).map((entry) => String(entry.address ?? '').trim()),
		...splitAddresses(options.bulkAddresses),
	].filter(Boolean);
	for (const address of addresses) {
		receivers.push(address.includes('@') ? { email: address } : { phone: address });
	}
	for (const contact of recipients.contacts ?? []) {
		if (Number(contact.contactId) > 0) {
			receivers.push(`contact:${Number(contact.contactId)}:all`);
		}
	}
	const groups = (recipients.groups ?? [])
		.map((group) => Number(group.groupId))
		.filter((id) => id > 0)
		.map((id) => ({ mode: 'group', id, column: 'all' }));

	if (!receivers.length && !groups.length) {
		throw new NodeOperationError(this.getNode(), 'Add at least one recipient', {
			itemIndex: i,
			description: 'Add an address, a contact or a contact group in "Recipients".',
		});
	}

	const body: IDataObject = {
		channel,
		originated: ORIGINATED,
		report: (options.report as string) || 'all',
		priority: (options.priority as string) || 'normal',
		simulation: options.simulation === true,
		...messageContent.call(this, i, channel),
	};
	if (receivers.length) {
		body.receivers = receivers as IDataObject[];
	}
	if (groups.length) {
		body.groups = groups;
	}
	const excluded = parseIdList(options.excludeGroupIds);
	if (excluded.length) {
		body.ignore_groups = excluded.map((id) => ({ mode: 'group', id, column: 'all' }));
	}
	const filters = jsonParameter.call(this, options.filters, i, 'Filters (JSON)');
	if (Array.isArray(filters) && filters.length) {
		body.filters = filters;
	}
	const parts = parseIdList(options.assetIds);
	if (parts.length) {
		body.parts = parts.map((id) => `asset:${id}`);
	}

	const segmentation = this.getNodeParameter('segmentation', i, {}) as IDataObject;
	if (Object.keys(segmentation).length) {
		body.segmentation = true;
		if (segmentation.segmentDate) {
			body.segment_date = dateParameter.call(this, segmentation.segmentDate, i, 'First Segment At');
		}
		if (segmentation.length !== undefined) {
			body.segment_length = Number(segmentation.length);
		}
		if (segmentation.interval !== undefined) {
			body.segment_interval = Number(segmentation.interval);
		}
		if (segmentation.intervalUnit) {
			body.segment_interval_unit = segmentation.intervalUnit;
		}
		if (segmentation.weekendIncluded !== undefined) {
			body.segment_weekend_included = segmentation.weekendIncluded === true;
		}
		if (segmentation.openPeriodBegin) {
			body.segment_open_period_begin = segmentation.openPeriodBegin;
		}
		if (segmentation.openPeriodEnd) {
			body.segment_open_period_end = segmentation.openPeriodEnd;
		}
	}

	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/messenger/broadcast', body, undefined, i),
	);
};

// ── Template ─────────────────────────────────────────────────────────────────────────────────────

const createTemplate: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const body: IDataObject = {
		title: this.getNodeParameter('title', i) as string,
		format: this.getNodeParameter('format', i) as string,
	};
	const subject = this.getNodeParameter('subject', i, '') as string;
	if (subject) {
		body.subject = subject;
	}
	const text = this.getNodeParameter('body', i, '') as string;
	if (text) {
		body.body = text;
	}
	if (options.comment) {
		body.comment = options.comment;
	}
	const parts = parseIdList(options.assetIds);
	if (parts.length) {
		body.parts = parts;
	}
	const extra = jsonParameter.call(this, options.extra, i, 'Extra (JSON)');
	if (extra && Object.keys(extra).length) {
		body.extra = extra;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/messenger/template', body, undefined, i),
	);
};

// ── Asset ────────────────────────────────────────────────────────────────────────────────────────

const uploadAsset: Handler = async function (i) {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const binary = this.helpers.assertBinaryData(i, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	const body: IDataObject = {
		asset: buffer.toString('base64'),
		base64: true,
		mime_type: binary.mimeType,
		filename: (options.fileName as string) || binary.fileName || 'file',
	};
	if (options.comment) {
		body.comment = options.comment;
	}
	if (Number(options.galleryId) > 0) {
		body.gallery_id = Number(options.galleryId);
	}
	if (options.private !== undefined) {
		body.private = options.private === true;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/gallery/asset', body, undefined, i),
	);
};

// ── Contact ──────────────────────────────────────────────────────────────────────────────────────

const createContactGroup: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const body: IDataObject = {
		group_name: this.getNodeParameter('groupName', i) as string,
		entry_type: 'contact',
	};
	if (options.comment) {
		body.comment = options.comment;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/file/group', body, undefined, i),
	);
};

const importContactFile: Handler = async function (i) {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const binary = this.helpers.assertBinaryData(i, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	const form = new FormData();
	form.append(
		'import',
		new Blob([new Uint8Array(buffer)], { type: binary.mimeType }),
		binary.fileName || 'contacts',
	);
	// Empty: Bi-Way picks the import format of the account matching the file.
	form.append('software-file', this.getNodeParameter('fileFormat', i, '') as string);
	if (Number(options.groupId) > 0) {
		form.append('group_id', String(Number(options.groupId)));
	}
	if (options.checkDouble) {
		form.append('check-double', String(options.checkDouble));
	}
	if (options.doubleKeyColumn) {
		form.append('double-key-column', String(options.doubleKeyColumn));
	}
	if (options.replaceTypes) {
		form.append('replace-type', String(options.replaceTypes).replace(/\s+/g, ''));
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/file/scheduler', form, undefined, i),
		'task_id',
	);
};

// ── RCS ──────────────────────────────────────────────────────────────────────────────────────────

const createKeywordReply: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const body: IDataObject = {
		type: 'keyword',
		label: this.getNodeParameter('label', i) as string,
		keyword: this.getNodeParameter('keyword', i) as string,
		// Bi-Way reads this field in camelCase.
		templateId: Number(this.getNodeParameter('templateId', i)),
	};
	if (options.pattern) {
		body.pattern = options.pattern;
	}
	if (options.active !== undefined) {
		body.state = options.active === true;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/chatbot/trigger', body, undefined, i),
	);
};

function rcsNextStep(
	declared: boolean,
	declarationState: string,
	declarationComplete: boolean,
	launched: boolean | null,
): string {
	if (launched === true) {
		return 'Your RCS agent is launched on at least one operator: you can send RCS messages.';
	}
	if (!declared) {
		return `Declare your RCS agent: ${RCS_DECLARATION_URL}`;
	}
	if (declarationState === 'rejected') {
		return `Your RCS declaration was rejected. Contact Bi-Way support (${SUPPORT_EMAIL}).`;
	}
	if (!declarationComplete) {
		return `Complete your RCS declaration in your Bi-Way RCS settings: ${RCS_SETTINGS_URL}`;
	}
	if (declarationState === 'done') {
		return 'Your RCS agent is created and awaits the approval of the mobile operators.';
	}
	return 'Bi-Way is processing your RCS declaration.';
}

const getRcsStatus: Handler = async function (i) {
	const statement = await biwayApiRequest.call(
		this,
		'COLLECTION',
		'/chatbot/account-statement',
		undefined,
		undefined,
		i,
	);
	const declaration =
		typeof statement === 'object' && statement !== null && 'id' in statement
			? (statement as IDataObject)
			: null;

	// Read-only accounts of an agency may not see the operators: the status stays unknown.
	const operatorsResponse = await biwayApiCall.call(
		this,
		'COLLECTION',
		'/chatbot/channel-operator',
		undefined,
		undefined,
		i,
	);
	let operators: IDataObject[] | null = null;
	let launched: boolean | null = null;
	if (!operatorsResponse.errorCode) {
		const body = (operatorsResponse.body ?? {}) as IDataObject;
		operators = Array.isArray(body.operators)
			? (body.operators as IDataObject[]).map((operator) => ({
					operator: operator.operator,
					operatorLabel: operator.operatorLabel,
					state: operator.state,
					dateState: operator.dateState,
				}))
			: [];
		launched = body.launched === true;
	} else if (!['no_permission', 'missing_property'].includes(operatorsResponse.errorCode)) {
		throw toBiwayError.call(this, operatorsResponse, i);
	}

	const declarationState = declaration ? String(declaration.state ?? '') : '';
	const declarationComplete = declaration ? declaration.complete === true : false;
	return {
		declared: declaration !== null,
		declarationState,
		declarationComplete,
		agentName: declaration ? (declaration.name ?? null) : null,
		launched,
		operators,
		readyToSend: launched === true,
		nextStep: rcsNextStep(declaration !== null, declarationState, declarationComplete, launched),
	};
};

const HANDLERS: Record<string, Record<string, Handler>> = {
	asset: { upload: uploadAsset },
	contact: { createGroup: createContactGroup, importFile: importContactFile },
	message: { send: sendMessage, broadcast: broadcastMessage },
	rcs: { createKeywordReply, getStatus: getRcsStatus },
	template: { create: createTemplate },
};

export class Biway implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bi-Way',
		name: 'biway',
		icon: { light: 'file:../../icons/biway.png', dark: 'file:../../icons/biway.png' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS, RCS and email messages with Bi-Way',
		defaults: { name: 'Bi-Way' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'biwayApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Asset', value: 'asset' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Message', value: 'message' },
					{ name: 'RCS Agent', value: 'rcs' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
			},
			...assetOperations,
			...assetFields,
			...contactOperations,
			...contactFields,
			...messageOperations,
			...messageFields,
			...rcsOperations,
			...rcsFields,
			...templateOperations,
			...templateFields,
		],
	};

	methods = {
		loadOptions: { getChannels, getContactGroups, getSenders, getTemplates },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const handler = HANDLERS[resource]?.[operation];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}
				const json = await handler.call(this, i);
				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Errors of the Bi-Way API are already explicit: rewrapping hands back the original.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
