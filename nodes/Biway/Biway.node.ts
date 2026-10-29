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
import { scenarioFields, scenarioOperations } from './descriptions/ScenarioDescription';
import { templateFields, templateOperations } from './descriptions/TemplateDescription';
import {
	biwayApiCall,
	biwayApiRequest,
	biwayListAll,
	locatorValue,
	type MessageContent,
	normalizeKeyword,
	normalizeResponse,
	parseIdList,
	parseJsonParameter,
	sameName,
	templateContent,
	toBiwayDate,
	toBiwayError,
} from './GenericFunctions';
import {
	getContactColumnList,
	getContactColumns,
	getContactMatchColumns,
} from './methods/contactColumns';
import {
	searchContactGroups,
	searchGalleryFiles,
	searchGalleryImages,
	searchScenarios,
	searchTemplates,
} from './methods/listSearch';
import { getChannels, getContactGroups, getImportFormats, getSenders } from './methods/loadOptions';
import {
	buildRcsButtons,
	buildRcsCard,
	buildRcsCarousel,
	buildRcsFallback,
	isEmailChannel,
	isRcsChannel,
	MESSAGE_BUTTONS_MAX,
} from './RcsContent';

const ORIGINATED = 'n8n';
const RCS_DECLARATION_URL = 'https://app.bi-way.fr/rcs-registration/';
const RCS_SETTINGS_URL = 'https://v3.bi-way.fr/settings/chatbot';
const SUPPORT_EMAIL = 'tech@pocketcommunication.com';

/** A handler returns one output item, or several (Get Many). */
type Handler = (this: IExecuteFunctions, i: number) => Promise<IDataObject | IDataObject[]>;

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────

function dateParameter(this: IExecuteFunctions, value: unknown, i: number, field: string): string {
	const date = toBiwayDate(String(value), this.getTimezone());
	if (date === null) {
		throw new NodeOperationError(this.getNode(), `The '${field}' value is not a valid date`, {
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
		throw new NodeOperationError(this.getNode(), `The '${field}' field is not valid JSON`, {
			itemIndex: i,
			description: (error as Error).message,
		});
	}
}

/** Cards and carousels go through RCS and email channels only. */
function requireRichChannel(
	this: IExecuteFunctions,
	i: number,
	channel: string,
	what: string,
): void {
	if (!isRcsChannel(channel) && !isEmailChannel(channel)) {
		throw new NodeOperationError(this.getNode(), `${what} need an RCS or email channel`, {
			itemIndex: i,
			description: `The channel '${channel}' cannot show them. Pick an RCS or email channel, or set 'Content' to 'Text'.`,
		});
	}
}

/** Templates each channel can carry, with their content, read once per execution. */
const compatibleTemplates = new WeakMap<
	IExecuteFunctions,
	Map<string, Map<number, MessageContent>>
>();

/**
 * Bi-Way lists, for a channel, the templates it can carry: no card outside RCS and email…
 * A template outside that list, or whose content is not the chosen one, is refused before sending.
 */
async function requireCompatibleTemplate(
	this: IExecuteFunctions,
	i: number,
	templateId: number,
	channel: string,
	content: MessageContent,
): Promise<void> {
	let byChannel = compatibleTemplates.get(this);
	if (!byChannel) {
		byChannel = new Map();
		compatibleTemplates.set(this, byChannel);
	}
	let templates = byChannel.get(channel);
	if (!templates) {
		const response = await biwayApiCall.call(
			this,
			'COLLECTION',
			'/messenger/template',
			undefined,
			{ channel, limit: 0 },
			i,
		);
		if (response.errorCode) {
			throw toBiwayError.call(this, response, i);
		}
		const list = Array.isArray(response.body)
			? (response.body as IDataObject[])
			: (((response.body as IDataObject | null)?.templates ?? []) as IDataObject[]);
		templates = new Map(
			list.map((template) => [Number(template.id), templateContent(template)] as const),
		);
		byChannel.set(channel, templates);
	}
	const actual = templates.get(templateId);
	if (actual === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`Template ${templateId} cannot be sent on the '${channel}' channel`,
			{
				itemIndex: i,
				description:
					'Bi-Way checked the content of the template against the channel: cards and carousels only go through RCS and email, RCS buttons only through RCS. Choose another template, or another channel.',
			},
		);
	}
	if (actual !== content) {
		throw new NodeOperationError(
			this.getNode(),
			`Template ${templateId} is a ${actual}, not a ${content}`,
			{
				itemIndex: i,
				description: `Set 'Content' to '${CONTENT_NAMES[actual]}', or choose another template.`,
			},
		);
	}
}

/** Names of the 'Content' options, for messages. */
const CONTENT_NAMES: Record<MessageContent, string> = {
	card: 'Card',
	carousel: 'Carousel',
	text: 'Text',
};

/**
 * Content (text, card or carousel, raw or from a template) and options shared by Send and
 * Broadcast.
 *
 * Cards and buttons of a direct sending go under the channel name: {"rcs": {"format", "cards" or
 * "suggestions"}}, {"email": {"format", "cards"}}. Bi-Way only files them there itself for
 * templates.
 *
 * Attachments come out as bare asset IDs, as messenger/submit reads them; Broadcast turns them
 * into "asset:<id>".
 */
async function messageContent(
	this: IExecuteFunctions,
	i: number,
	channel: string,
): Promise<IDataObject> {
	const body: IDataObject = {};
	const content = this.getNodeParameter('content', i, 'text') as MessageContent;
	const source = this.getNodeParameter('source', i, 'raw') as string;
	const email = isEmailChannel(channel);
	let channelExtra: IDataObject | null = null;
	if (source === 'template') {
		const templateId = Number(this.getNodeParameter('templateId', i, '', { extractValue: true }));
		await requireCompatibleTemplate.call(this, i, templateId, channel, content);
		body.template_id = templateId;
	} else if (content === 'card') {
		requireRichChannel.call(this, i, channel, 'Cards');
		const card = await buildRcsCard.call(this, i);
		// No body, as in the Bi-Way app: Bi-Way sends a message with a body as plain text, without
		// its cards. The fallback SMS comes from 'alternate'.
		body.body = '';
		channelExtra = { format: 'card', cards: [card] };
	} else if (content === 'carousel') {
		requireRichChannel.call(this, i, channel, 'Carousels');
		const cards = await buildRcsCarousel.call(this, i);
		body.body = '';
		// "cards": Bi-Way checks every card, and sends several cards as a carousel.
		channelExtra = { format: 'cards', cards };
	} else if (email) {
		body.body = this.getNodeParameter('body', i) as string;
		const attachments = this.getNodeParameter('attachments', i, {}) as {
			attachment?: Array<{ assetId?: unknown }>;
		};
		const parts = (attachments.attachment ?? [])
			.map((attachment) => Number(locatorValue(attachment.assetId)))
			.filter((id) => id > 0);
		if (parts.length) {
			body.parts = parts;
		}
	} else {
		body.body = this.getNodeParameter('body', i) as string;
		// Buttons only exist on RCS: on SMS the field is hidden and ignored.
		const buttons = isRcsChannel(channel) ? buildRcsButtons.call(this, i, MESSAGE_BUTTONS_MAX) : [];
		if (buttons.length) {
			channelExtra = { format: 'text', suggestions: buttons };
		}
	}
	// Every email written in the node has a subject. With a template, Bi-Way takes the template's.
	if (email && source !== 'template') {
		const subject = String(this.getNodeParameter('subject', i, '') ?? '').trim();
		if (subject === '') {
			throw new NodeOperationError(this.getNode(), 'The email has no subject', {
				itemIndex: i,
				description: "Fill in the 'Subject' field: email channels need one.",
			});
		}
		body.subject = subject;
	}

	// Fallback SMS of an RCS message. With a template, only `alternate` is sent: Bi-Way takes the
	// rest of the RCS content from the template and keeps the request's `alternate` on top of it.
	if (isRcsChannel(channel)) {
		const alternate = buildRcsFallback.call(this, i);
		if (alternate !== undefined) {
			channelExtra =
				source === 'template'
					? { alternate }
					: { ...(channelExtra ?? { format: 'text' }), alternate };
		}
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
	const extra = (jsonParameter.call(this, options.extra, i, 'Extra (JSON)') ?? {}) as IDataObject;
	if (channelExtra) {
		const current = extra[channel];
		extra[channel] = {
			...(typeof current === 'object' && current !== null ? (current as IDataObject) : {}),
			...channelExtra,
		};
	}
	if (Object.keys(extra).length) {
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
		...(await messageContent.call(this, i, channel)),
	};
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
		groups?: Array<{ groupId?: unknown }>;
	};

	// Typed addresses become temporary contacts: Bi-Way reads the column named by the key, the
	// email address on an email channel, the phone number on the others.
	const addressKey = isEmailChannel(channel) ? 'email' : 'phone';
	const receivers: Array<IDataObject | string> = [];
	const addresses = [
		...(recipients.addresses ?? []).map((entry) => String(entry.address ?? '').trim()),
		...splitAddresses(options.bulkAddresses),
	].filter(Boolean);
	for (const address of addresses) {
		receivers.push({ [addressKey]: address });
	}
	for (const contact of recipients.contacts ?? []) {
		if (Number(contact.contactId) > 0) {
			receivers.push(`contact:${Number(contact.contactId)}:all`);
		}
	}
	const groups = (recipients.groups ?? [])
		.map((group) => Number(locatorValue(group.groupId)))
		.filter((id) => id > 0)
		.map((id) => ({ mode: 'group', id, column: 'all' }));

	if (!receivers.length && !groups.length) {
		throw new NodeOperationError(this.getNode(), 'Add at least one recipient', {
			itemIndex: i,
			description: "Add an address, a contact or a contact group in 'Recipients'.",
		});
	}

	const body: IDataObject = {
		channel,
		originated: ORIGINATED,
		report: (options.report as string) || 'all',
		priority: (options.priority as string) || 'normal',
		simulation: options.simulation === true,
		...(await messageContent.call(this, i, channel)),
	};
	// messenger/broadcast reads an asset of the gallery as "asset:<id>", not as a bare ID.
	if (Array.isArray(body.parts)) {
		body.parts = (body.parts as number[]).map((id) => `asset:${id}`);
	}
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

/**
 * Applies the "If … Already Exists" choice. Returns the item to output instead of creating one, or
 * null to go on with the creation.
 */
function existingOutcome(
	this: IExecuteFunctions,
	i: number,
	existing: IDataObject | undefined,
	what: string,
): IDataObject | null {
	if (!existing) {
		return null;
	}
	const ifExists = this.getNodeParameter('ifExists', i, 'useExisting') as string;
	if (ifExists === 'fail') {
		throw new NodeOperationError(
			this.getNode(),
			`${what} already exists (ID ${String(existing.id)})`,
			{
				itemIndex: i,
				description:
					"Change the name, or choose 'Use Existing' in the 'If … Already Exists' field.",
			},
		);
	}
	if (ifExists === 'useExisting') {
		return { ...existing, existing: true };
	}
	return null;
}

// ── Template ─────────────────────────────────────────────────────────────────────────────────────

const createTemplate: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const content = this.getNodeParameter('content', i, 'text') as MessageContent;
	const body: IDataObject = {
		title: this.getNodeParameter('title', i) as string,
		// Emails sent from the template take its subject, whatever the format.
		subject: this.getNodeParameter('subject', i) as string,
		// A carousel template is a card template with several cards.
		format: content === 'text' ? 'text' : 'card',
	};

	if (this.getNodeParameter('ifExists', i, 'useExisting') !== 'create') {
		const templates = await biwayListAll.call(
			this,
			'/messenger/template',
			{ sort_by: 'title', sort_dir: 'asc' },
			100,
			i,
		);
		const existing = templates.find((template) => sameName(template.title, body.title));
		const outcome = existingOutcome.call(
			this,
			i,
			existing,
			`A template titled '${String(body.title)}'`,
		);
		if (outcome) {
			return outcome;
		}
	}

	if (options.comment) {
		body.comment = options.comment;
	}
	const extra = (jsonParameter.call(this, options.extra, i, 'Extra (JSON)') ?? {}) as IDataObject;
	// Templates keep their RCS content at the root: Bi-Way files it under the channel when sending.
	if (content === 'card') {
		extra.cards = [await buildRcsCard.call(this, i)];
	} else if (content === 'carousel') {
		extra.cards = await buildRcsCarousel.call(this, i);
	} else {
		body.body = this.getNodeParameter('body', i) as string;
		const buttons = buildRcsButtons.call(this, i, MESSAGE_BUTTONS_MAX);
		if (buttons.length) {
			extra.suggestions = buttons;
		}
	}
	if (Object.keys(extra).length) {
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

	if (this.getNodeParameter('ifExists', i, 'useExisting') !== 'create') {
		const groups = await biwayApiRequest.call(
			this,
			'COLLECTION',
			'/file/group',
			undefined,
			{ entry_type: 'contact' },
			i,
		);
		// Archived groups (negative state) do not count.
		const existing = (Array.isArray(groups) ? (groups as IDataObject[]) : []).find(
			(group) => Number(group.state ?? 0) >= 0 && sameName(group.title, body.group_name),
		);
		const outcome = existingOutcome.call(
			this,
			i,
			existing,
			`A contact group named '${String(body.group_name)}'`,
		);
		if (outcome) {
			return outcome;
		}
	}
	if (options.comment) {
		body.comment = options.comment;
	}
	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/file/group', body, undefined, i),
	);
};

/** Contact columns of the account, read once per execution: the whitelist of field names. */
const contactColumnsCache = new WeakMap<IExecuteFunctions, Promise<Set<string>>>();

async function writableContactColumns(this: IExecuteFunctions): Promise<Set<string>> {
	let columns = contactColumnsCache.get(this);
	if (!columns) {
		columns = getContactColumnList
			.call(this)
			.then((list) => new Set(list.map((column) => column.name)));
		contactColumnsCache.set(this, columns);
	}
	return await columns;
}

/** The contact of the account whose column has exactly this value. */
async function findContact(
	this: IExecuteFunctions,
	i: number,
	column: string,
	value: string,
): Promise<IDataObject | undefined> {
	const found = await biwayApiRequest.call(
		this,
		'COLLECTION',
		'/file/entry',
		{
			groups: [{ mode: 'type', id: 'contact', column: 'all', limit: 1 }],
			filters: {
				comparison: 'none',
				fields: [{ comparison: 'none', name: column, precision: 'same_as', value }],
			},
		},
		undefined,
		i,
	);
	return Array.isArray(found) && found.length ? (found[0] as IDataObject) : undefined;
}

const createContact: Handler = async function (i) {
	const mapped = (this.getNodeParameter('contactColumns.value', i, {}) ?? {}) as IDataObject;
	const allowed = await writableContactColumns.call(this);

	// Only names of the account's own column list are sent to Bi-Way, never a free name.
	const values: IDataObject = {};
	for (const [column, value] of Object.entries(mapped)) {
		if (value === null || value === undefined || value === '') {
			continue;
		}
		if (!allowed.has(column)) {
			throw new NodeOperationError(this.getNode(), `Unknown contact column '${column}'`, {
				itemIndex: i,
				description:
					'Refresh the column list of the node: this column does not exist on your Bi-Way account.',
			});
		}
		values[column] = column === 'phone' ? String(value).replace(/\s+/g, '') : value;
	}
	if (!Object.keys(values).length) {
		throw new NodeOperationError(this.getNode(), 'No contact column is filled in', {
			itemIndex: i,
			description: 'Map at least one column, such as the phone number or the email address.',
		});
	}

	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const body: IDataObject = { entry_type: 'contact', ...values, check_double: 'none' };
	const groupId = Number(locatorValue(options.groupId));
	if (groupId > 0) {
		body.group_id = groupId;
	}

	const ifExists = this.getNodeParameter('ifExists', i, 'useExisting') as string;
	if (ifExists !== 'create') {
		// A contact is recognized by the chosen column, a name of the account's own list only:
		// Bi-Way puts it as is in its search condition.
		const matchOn = (this.getNodeParameter('matchOn', i, 'phone') as string) || 'phone';
		if (!allowed.has(matchOn)) {
			throw new NodeOperationError(this.getNode(), `Unknown contact column '${matchOn}'`, {
				itemIndex: i,
				description:
					"Pick the 'Match On Column' from the list: this column does not exist on your Bi-Way account.",
			});
		}
		const matchValue = values[matchOn];
		if (matchValue !== undefined) {
			const existing = await findContact.call(this, i, matchOn, String(matchValue));
			if (existing && ifExists === 'update') {
				// Bi-Way rewrites the whole contact: the columns not mapped here keep their value.
				for (const column of allowed) {
					const current = existing[column];
					if (column in values || current === undefined || current === null || current === '') {
						continue;
					}
					// An empty date is stored as 0000-00-00.
					if (!String(current).startsWith('0000-00-00')) {
						body[column] = current;
					}
				}
				if (body.group_id === undefined && existing.group_id) {
					body.group_id = existing.group_id;
				}
				// Bi-Way updates the contact of the account that has the same value in this column.
				body.check_double = 'account';
				body.key_column = matchOn;
				body.update_if_double = true;
				return {
					...normalizeResponse(
						await biwayApiRequest.call(this, 'POST', '/file/entry', body, undefined, i),
					),
					updated: true,
				};
			}
			const outcome = existingOutcome.call(
				this,
				i,
				existing,
				`A contact with this value in the '${matchOn}' column`,
			);
			if (outcome) {
				return outcome;
			}
		}
	}

	return normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/file/entry', body, undefined, i),
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
	const groupId = Number(locatorValue(options.groupId));
	if (groupId > 0) {
		form.append('group_id', String(groupId));
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
		templateId: Number(this.getNodeParameter('templateId', i, '', { extractValue: true })),
	};

	// Bi-Way refuses a second reply for the same keyword: look it up as Bi-Way stores it.
	const keyword = normalizeKeyword(body.keyword);
	if (keyword) {
		const lookup = await biwayApiCall.call(
			this,
			'GET',
			`/chatbot/trigger/${encodeURIComponent(keyword)}`,
			undefined,
			{ search_by_keyword: 1 },
			i,
		);
		if (lookup.errorCode && lookup.errorCode !== 'trigger_not_found') {
			throw toBiwayError.call(this, lookup, i);
		}
		if (!lookup.errorCode) {
			const outcome = existingOutcome.call(
				this,
				i,
				lookup.body as IDataObject,
				`A keyword reply for '${keyword}'`,
			);
			if (outcome) {
				return outcome;
			}
		}
	}
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

// ── Scenario ─────────────────────────────────────────────────────────────────────────────────────

function scenarioId(this: IExecuteFunctions, i: number): number {
	return Number(this.getNodeParameter('scenarioId', i, '', { extractValue: true }));
}

async function getScenario(this: IExecuteFunctions, i: number, id: number): Promise<IDataObject> {
	return (await biwayApiRequest.call(
		this,
		'GET',
		`/chatbot/script/${id}`,
		undefined,
		undefined,
		i,
	)) as IDataObject;
}

/** Main fields of a scenario, for the 'Simplify' option (the raw object holds its landing page too). */
function simplifyScenario(scenario: IDataObject): IDataObject {
	const simple: IDataObject = {
		id: scenario.id,
		title: scenario.title,
		active: Number(scenario.state) === 1,
		templateId: scenario.templateId,
		comment: scenario.comment ?? null,
		createdAt: scenario.datetime,
	};
	if (Array.isArray(scenario.flow)) {
		simple.steps = scenario.flow.length;
	}
	return simple;
}

function scenarioOutput(
	this: IExecuteFunctions,
	i: number,
	scenarios: IDataObject | IDataObject[],
): IDataObject | IDataObject[] {
	if (!(this.getNodeParameter('simplify', i, true) as boolean)) {
		return scenarios;
	}
	return Array.isArray(scenarios) ? scenarios.map(simplifyScenario) : simplifyScenario(scenarios);
}

async function setScenarioState(
	this: IExecuteFunctions,
	i: number,
	id: number,
	active: boolean,
): Promise<void> {
	await biwayApiRequest.call(
		this,
		'PATCH',
		`/chatbot/script/${id}`,
		{ column: 'state', value: active ? 1 : 0 },
		undefined,
		i,
	);
}

const createScenario: Handler = async function (i) {
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const body: IDataObject = {
		title: this.getNodeParameter('title', i) as string,
		// Bi-Way reads this field in camelCase.
		templateId: Number(this.getNodeParameter('templateId', i, '', { extractValue: true })),
	};
	if (options.comment) {
		body.comment = options.comment;
	}
	const { id } = normalizeResponse(
		await biwayApiRequest.call(this, 'POST', '/chatbot/script', body, undefined, i),
	);
	// Bi-Way always creates a scenario inactive.
	if (options.activate !== false) {
		await setScenarioState.call(this, i, Number(id), true);
	}
	return scenarioOutput.call(this, i, await getScenario.call(this, i, Number(id)));
};

const getScenarioHandler: Handler = async function (i) {
	return scenarioOutput.call(this, i, await getScenario.call(this, i, scenarioId.call(this, i)));
};

const getManyScenarios: Handler = async function (i) {
	if (this.getNodeParameter('returnAll', i, false) as boolean) {
		return scenarioOutput.call(
			this,
			i,
			await biwayListAll.call(
				this,
				'/chatbot/script',
				{ sort_by: 'datetime', sort_dir: 'desc' },
				100,
				i,
			),
		);
	}
	const body = await biwayApiRequest.call(
		this,
		'COLLECTION',
		'/chatbot/script',
		undefined,
		{
			sort_by: 'datetime',
			sort_dir: 'desc',
			offset: 0,
			limit: this.getNodeParameter('limit', i, 50) as number,
		},
		i,
	);
	return scenarioOutput.call(this, i, Array.isArray(body) ? (body as IDataObject[]) : []);
};

const activateScenario: Handler = async function (i) {
	const id = scenarioId.call(this, i);
	await setScenarioState.call(this, i, id, true);
	return { id, active: true };
};

const deactivateScenario: Handler = async function (i) {
	const id = scenarioId.call(this, i);
	await setScenarioState.call(this, i, id, false);
	return { id, active: false };
};

const deleteScenario: Handler = async function (i) {
	const id = scenarioId.call(this, i);
	await biwayApiRequest.call(this, 'DELETE', `/chatbot/script/${id}`, undefined, undefined, i);
	return { id, deleted: true };
};

const startScenario: Handler = async function (i) {
	const id = scenarioId.call(this, i);
	const scenario = await getScenario.call(this, i, id);
	const templateId = Number(scenario.templateId ?? 0);
	if (!(templateId > 0)) {
		throw new NodeOperationError(this.getNode(), `The scenario ${id} has no first message`, {
			itemIndex: i,
			description:
				'Set its first template in Bi-Way, or create it again with RCS Scenario › Create.',
		});
	}
	const body: IDataObject = {
		channel: (this.getNodeParameter('channel', i, 'rcs') as string) || 'rcs',
		receiver: (this.getNodeParameter('receiver', i) as string).trim(),
		template_id: templateId,
		operation: 'notification',
		originated: ORIGINATED,
	};
	return {
		scenarioId: id,
		...normalizeResponse(
			await biwayApiRequest.call(this, 'POST', '/messenger/submit', body, undefined, i),
		),
	};
};

const HANDLERS: Record<string, Record<string, Handler>> = {
	asset: { upload: uploadAsset },
	contact: {
		create: createContact,
		createGroup: createContactGroup,
		importFile: importContactFile,
	},
	message: { send: sendMessage, broadcast: broadcastMessage },
	rcs: { createKeywordReply, getStatus: getRcsStatus },
	scenario: {
		activate: activateScenario,
		create: createScenario,
		deactivate: deactivateScenario,
		delete: deleteScenario,
		get: getScenarioHandler,
		getAll: getManyScenarios,
		start: startScenario,
	},
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
		description:
			'Send SMS, RCS and email messages (cards, carousels, buttons) with Bi-Way. RCS is currently available on French mobile operators only.',
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
					{ name: 'RCS Scenario', value: 'scenario' },
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
			...scenarioOperations,
			...scenarioFields,
			...templateOperations,
			...templateFields,
		],
	};

	methods = {
		listSearch: {
			searchContactGroups,
			searchGalleryFiles,
			searchGalleryImages,
			searchScenarios,
			searchTemplates,
		},
		loadOptions: {
			getChannels,
			// Still a list for 'Exclude Contact Group Names or IDs', which takes several groups.
			getContactGroups,
			getContactMatchColumns,
			getImportFormats,
			getSenders,
		},
		resourceMapping: { getContactColumns },
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
						`The operation '${operation}' is not supported for '${resource}'`,
						{ itemIndex: i },
					);
				}
				const result = await handler.call(this, i);
				for (const json of Array.isArray(result) ? result : [result]) {
					returnData.push({ json, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Errors of the Bi-Way API are already explicit: rewrapping hands back the original.
				const nodeError =
					error instanceof NodeApiError
						? new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i })
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				// n8n UX guidelines: the message names the input item that stopped the execution.
				if (items.length > 1 && !nodeError.message.endsWith(']')) {
					nodeError.message += ` [Item ${i}]`;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
