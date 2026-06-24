import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(raw: string | IDataObject | undefined, field: string): IDataObject | undefined {
	if (!raw) return undefined;
	if (typeof raw === 'object') return raw;
	try {
		return JSON.parse(raw) as IDataObject;
	} catch {
		throw new Error(`Field "${field}" must be valid JSON.`);
	}
}

function parseCommaSeparatedIds(raw: string | undefined): number[] | undefined {
	if (!raw || raw.trim() === '') return undefined;
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map(Number);
}

// ─── node ────────────────────────────────────────────────────────────────────

export class BiwayMessenger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bi-Way Messenger',
		name: 'biwayMessenger',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with the Bi-Way Messaging API',
		defaults: { name: 'Bi-Way Messenger' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'biwayMessengerApi', required: true }],
		properties: [

			// ── Resource ──────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Asset', value: 'asset' },
					{ name: 'Callback URL', value: 'callbackUrl' },
					{ name: 'Chatbot Trigger', value: 'chatbotTrigger' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Message', value: 'message' },
					{ name: 'RCS Agent', value: 'rcsAgent' },
					{ name: 'Template', value: 'template' },
				],
				default: 'message',
			},

			// ── Operations ────────────────────────────────────────────────────

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a new sub-account', action: 'Create an account' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['asset'] } },
				options: [
					{ name: 'Upload', value: 'upload', description: 'Upload an image asset to the gallery', action: 'Upload an asset' },
				],
				default: 'upload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['callbackUrl'] } },
				options: [
					{ name: 'Register', value: 'register', description: 'Register a callback URL for an event type', action: 'Register a callback URL' },
					{ name: 'Delete', value: 'delete', description: 'Delete a registered callback URL', action: 'Delete a callback URL' },
				],
				default: 'register',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['chatbotTrigger'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a keyword chatbot trigger', action: 'Create a chatbot trigger' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{ name: 'Create Group', value: 'createGroup', description: 'Create a contact group', action: 'Create a contact group' },
					{ name: 'Import File', value: 'importFile', description: 'Import contacts from a file (async)', action: 'Import a contact file' },
				],
				default: 'createGroup',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['customer'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Register a new customer', action: 'Create a customer' },
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{ name: 'Send', value: 'send', description: 'Send a transactional message to one recipient', action: 'Send a message' },
					{ name: 'Broadcast', value: 'broadcast', description: 'Send a message to multiple recipients or groups', action: 'Broadcast a message' },
				],
				default: 'send',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['rcsAgent'] } },
				options: [
					{ name: 'Declare', value: 'declare', description: 'Declare a new RCS chatbot agent', action: 'Declare an RCS agent' },
				],
				default: 'declare',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['template'] } },
				options: [
					{ name: 'Create', value: 'create', description: 'Create a message template', action: 'Create a template' },
				],
				default: 'create',
			},

			// ── Account > Create ───────────────────────────────────────────────
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['account'], operation: ['create'] } },
				description: 'Account username',
			},
			{
				displayName: 'Password',
				name: 'password1',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['account'], operation: ['create'] } },
				description: 'Account password',
			},
			{
				displayName: 'Password (Confirm)',
				name: 'password2',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['account'], operation: ['create'] } },
				description: 'Must match the password above',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['account'], operation: ['create'] } },
				options: [
					{
						displayName: 'Customer ID',
						name: 'customerId',
						type: 'number',
						default: 0,
						description: 'ID of an existing customer to associate with this account',
					},
					{
						displayName: 'Customer (JSON)',
						name: 'customerJson',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'New customer as a JSON object with name, siren, website, address, contact fields. Used only when Customer ID is not set.',
					},
				],
			},

			// ── Asset > Upload ─────────────────────────────────────────────────
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['asset'], operation: ['upload'] } },
				description: 'Name of the binary property containing the image file',
			},
			{
				displayName: 'Filename',
				name: 'filename',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['asset'], operation: ['upload'] } },
				description: 'Filename for the asset. Allowed characters: a-z A-Z 0-9 - _ .',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				required: true,
				default: 'image/jpeg',
				displayOptions: { show: { resource: ['asset'], operation: ['upload'] } },
				description: 'MIME type of the image (e.g. image/jpeg, image/png)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['asset'], operation: ['upload'] } },
				options: [
					{
						displayName: 'Gallery ID',
						name: 'galleryId',
						type: 'number',
						default: 0,
						description: 'Target gallery ID. Default gallery is used when not set.',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Optional comment about the asset. Tip: use logo (224×224 px), cover (1440×448 px) or preview (1200×630 px) to document the intended role.',
					},
					{
						displayName: 'Return Path',
						name: 'returnPath',
						type: 'boolean',
						default: false,
						description: 'Whether to return the public URL path of the uploaded asset',
					},
				],
			},

			// ── Callback URL > Register ────────────────────────────────────────
			{
				displayName: 'URL',
				name: 'callbackUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['callbackUrl'], operation: ['register'] } },
				description: 'HTTPS URL that will receive event notifications',
			},
			{
				displayName: 'Event Type',
				name: 'event',
				type: 'options',
				options: [
					{ name: 'Account State', value: 'ACCOUNT_STATE' },
					{ name: 'Chatbot Capabilities Check', value: 'CHATBOT_CAPABILITIES_CHECK' },
					{ name: 'Chatbot State', value: 'CHATBOT_STATE' },
					{ name: 'Customer State', value: 'CUSTOMER_STATE' },
					{ name: 'File Import Task State', value: 'IMPORT_TASK_STATE' },
					{ name: 'Message Delivery', value: 'MESSENGER_DELIVERY' },
					{ name: 'Message Report', value: 'MESSENGER_REPORT' },
				],
				default: 'MESSENGER_REPORT',
				displayOptions: { show: { resource: ['callbackUrl'], operation: ['register'] } },
				description: 'Event type to associate with this callback URL',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['callbackUrl'], operation: ['register'] } },
				options: [
					{
						displayName: 'Grouped',
						name: 'grouped',
						type: 'boolean',
						default: true,
						description: 'Whether to group multiple events into a single callback call',
					},
				],
			},

			// ── Callback URL > Delete ──────────────────────────────────────────
			{
				displayName: 'Callback URL ID',
				name: 'callbackUrlId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: { show: { resource: ['callbackUrl'], operation: ['delete'] } },
				description: 'Unique ID of the callback URL to delete',
			},

			// ── Chatbot Trigger > Create ───────────────────────────────────────
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['chatbotTrigger'], operation: ['create'] } },
				description: 'Human-readable label for this trigger',
			},
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['chatbotTrigger'], operation: ['create'] } },
				description: 'Keyword that activates this trigger. Allowed characters: A-Z, 0-9, underscore. Must be unique per account.',
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: { show: { resource: ['chatbotTrigger'], operation: ['create'] } },
				description: 'ID of the submit template to send when this trigger fires',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['chatbotTrigger'], operation: ['create'] } },
				options: [
					{
						displayName: 'Pattern',
						name: 'pattern',
						type: 'string',
						default: '',
						description: 'Personalization pattern. Format: (entryTypeName:entryTypeId) or (entryTypeName:entryTypeId, entryTypeName.entryColumnName)',
					},
				],
			},

			// ── Contact > Create Group ─────────────────────────────────────────
			{
				displayName: 'Group Name',
				name: 'groupName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['createGroup'] } },
				description: 'Name of the contact group',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['contact'], operation: ['createGroup'] } },
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
				],
			},

			// ── Contact > Import File ──────────────────────────────────────────
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['contact'], operation: ['importFile'] } },
				description: 'Name of the binary property containing the contact file',
			},
			{
				displayName: 'File Adapter',
				name: 'softwareFile',
				type: 'options',
				options: [
					{ name: 'CSV', value: 'CSVFile' },
					{ name: 'JSON', value: 'JsonFile' },
					{ name: 'XLS (Excel 97-2003)', value: 'XlsFile' },
					{ name: 'XLSX (Excel 2007+)', value: 'XlsxFile' },
				],
				required: true,
				default: 'XlsxFile',
				displayOptions: { show: { resource: ['contact'], operation: ['importFile'] } },
				description: 'Bi-Way file adapter matching the uploaded file format',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['contact'], operation: ['importFile'] } },
				options: [
					{
						displayName: 'Group ID',
						name: 'groupId',
						type: 'number',
						default: 0,
						description: 'ID of the contact group to import into. Default group is used when not set.',
					},
					{
						displayName: 'Check Doubles',
						name: 'checkDouble',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Account-wide', value: 'account' },
							{ name: 'Within Group', value: 'group' },
						],
						default: 'none',
						description: 'How to handle duplicate contacts',
					},
					{
						displayName: 'Double Key Column',
						name: 'doubleKey',
						type: 'string',
						default: '',
						description: 'Column name used to detect duplicates when Check Doubles is enabled',
					},
					{
						displayName: 'Replace Entry Types (comma-separated)',
						name: 'replaceType',
						type: 'string',
						default: '',
						description: 'Entry type names to clear before import, comma-separated (e.g. contact)',
					},
				],
			},

			// ── Customer > Create ──────────────────────────────────────────────
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
				description: 'Customer company name',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['customer'], operation: ['create'] } },
				options: [
					{ displayName: 'SIREN', name: 'siren', type: 'number', default: 0, description: 'French company registration number' },
					{ displayName: 'Website', name: 'website', type: 'string', default: '' },
					{
						displayName: 'Address (JSON)',
						name: 'addressJson',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'JSON object with building, street, complement, postal_code, city, country',
					},
					{
						displayName: 'Contact (JSON)',
						name: 'contactJson',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'JSON object with name, surname, phone, email',
					},
				],
			},

			// ── Message > Send ─────────────────────────────────────────────────
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				required: true,
				default: 'rcs',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'Channel to use for sending (e.g. rcs, sms, email)',
			},
			{
				displayName: 'Receiver',
				name: 'receiver',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				description: 'Recipient address (E.164 phone number for SMS/RCS, email address for email)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
				options: [
					{
						displayName: 'Operation Type',
						name: 'operationType',
						type: 'options',
						options: [
							{ name: 'Normal', value: 'normal' },
							{ name: 'Test', value: 'test' },
							{ name: 'Notification', value: 'notification' },
							{ name: 'Auto-Reply', value: 'auto-reply' },
							{ name: 'Chat', value: 'chat' },
						],
						default: 'normal',
					},
					{ displayName: 'Originated', name: 'originated', type: 'string', default: '', description: 'System originating the message' },
					{ displayName: 'No Template', name: 'noTemplate', type: 'boolean', default: false, description: 'Whether to send without applying the default account template' },
					{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
					{ displayName: 'Body', name: 'body', type: 'string', typeOptions: { rows: 3 }, default: '' },
					{ displayName: 'Template ID', name: 'templateId', type: 'number', default: 0, description: 'ID of the submit template to use' },
					{ displayName: 'Asset IDs (comma-separated)', name: 'parts', type: 'string', default: '', description: 'Comma-separated gallery asset IDs to attach' },
					{ displayName: 'Extra (JSON)', name: 'extra', type: 'string', typeOptions: { rows: 5 }, default: '', description: 'Channel-specific payload as JSON (RCS cards, suggestions, alternate SMS)' },
					{ displayName: 'Send Date', name: 'date', type: 'string', default: '', description: 'Schedule send date in format Y-M-D h:m (leave empty to send immediately)' },
				],
			},

			// ── Message > Broadcast ────────────────────────────────────────────
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				required: true,
				default: 'rcs',
				displayOptions: { show: { resource: ['message'], operation: ['broadcast'] } },
				description: 'Channel to use for sending (e.g. rcs, sms, email)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['broadcast'] } },
				options: [
					{ displayName: 'Title', name: 'title', type: 'string', default: '' },
					{ displayName: 'Simulation', name: 'simulation', type: 'boolean', default: false, description: 'Whether to simulate the send without actually delivering messages' },
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [{ name: 'Normal', value: 'normal' }, { name: 'Urgent (≤100 recipients)', value: 'urgent' }],
						default: 'normal',
					},
					{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
					{ displayName: 'Body', name: 'body', type: 'string', typeOptions: { rows: 3 }, default: '' },
					{ displayName: 'Template ID', name: 'templateId', type: 'number', default: 0 },
					{ displayName: 'Originated', name: 'originated', type: 'string', default: '' },
					{ displayName: 'Asset IDs (comma-separated)', name: 'parts', type: 'string', default: '' },
					{ displayName: 'Extra (JSON)', name: 'extra', type: 'string', typeOptions: { rows: 5 }, default: '', description: 'Channel-specific payload as JSON (RCS cards, suggestions, alternate SMS)' },
					{ displayName: 'Receivers (comma-separated)', name: 'receivers', type: 'string', default: '', description: 'Individual recipient addresses or pattern strings' },
					{ displayName: 'Groups (JSON)', name: 'groups', type: 'string', typeOptions: { rows: 3 }, default: '', description: 'JSON array of group selectors: [{mode, id, column}]' },
					{ displayName: 'Ignore Groups (JSON)', name: 'ignoreGroups', type: 'string', default: '', description: 'JSON array of group selectors to exclude' },
					{ displayName: 'Filters (JSON)', name: 'filters', type: 'string', default: '', description: 'JSON array of filter conditions to apply on groups' },
					{ displayName: 'Send Date', name: 'date', type: 'string', default: '', description: 'Schedule date in format Y-M-D h:m:00' },
					{ displayName: 'Segmentation', name: 'segmentation', type: 'boolean', default: false },
					{ displayName: 'Segment Date', name: 'segmentDate', type: 'string', default: '' },
					{ displayName: 'Segment Length', name: 'segmentLength', type: 'number', default: 0 },
					{ displayName: 'Segment Interval', name: 'segmentInterval', type: 'number', default: 0 },
					{
						displayName: 'Segment Interval Unit',
						name: 'segmentIntervalUnit',
						type: 'options',
						options: [{ name: 'Day', value: 'day' }, { name: 'Hour', value: 'hour' }],
						default: 'day',
					},
					{ displayName: 'Segment Include Weekends', name: 'segmentWeekendIncluded', type: 'boolean', default: false },
					{ displayName: 'Segment Open Period Begin (HH:mm)', name: 'segmentOpenPeriodBegin', type: 'string', default: '' },
					{ displayName: 'Segment Open Period End (HH:mm)', name: 'segmentOpenPeriodEnd', type: 'string', default: '' },
				],
			},

			// ── RCS Agent > Declare ────────────────────────────────────────────
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Public name of the RCS agent (max 40 characters)',
			},
			{
				displayName: 'Description',
				name: 'agentDescription',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Short public description of the agent (max 100 characters)',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'string',
				required: true,
				default: '#000000',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Agent brand color in hex format (#RRGGBB)',
			},
			{
				displayName: 'Logo Asset ID',
				name: 'logo',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Gallery asset ID for the agent logo. Required dimensions: 224×224 px.',
			},
			{
				displayName: 'Cover Asset ID',
				name: 'cover',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Gallery asset ID for the agent cover/banner. Required dimensions: 1440×448 px.',
			},
			{
				displayName: 'Privacy URL',
				name: 'privacyUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'URL of the privacy policy page',
			},
			{
				displayName: 'Terms URL',
				name: 'conditionsUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'URL of the terms of use page',
			},
			{
				displayName: 'Contact Phone',
				name: 'contactPhone',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				description: 'Agent contact phone in E.164 format (e.g. +33600000000)',
			},
			{
				displayName: 'Contact Email',
				name: 'contactEmail',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
			},
			{
				displayName: 'Contact URL',
				name: 'contactUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['rcsAgent'], operation: ['declare'] } },
				options: [
					{
						displayName: 'Preview Asset ID',
						name: 'preview',
						type: 'number',
						default: 0,
						description: 'Gallery asset ID for the agent share preview. Required dimensions: 1200×630 px.',
					},
				],
			},

			// ── Template > Create ──────────────────────────────────────────────
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
				description: 'Internal description of the template',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'HTML', value: 'html' },
					{ name: 'Media', value: 'media' },
					{ name: 'Card (RCS)', value: 'card' },
				],
				required: true,
				default: 'text',
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['template'], operation: ['create'] } },
				options: [
					{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
					{ displayName: 'Body', name: 'body', type: 'string', typeOptions: { rows: 4 }, default: '' },
					{ displayName: 'Asset IDs (comma-separated)', name: 'parts', type: 'string', default: '', description: 'Comma-separated gallery asset IDs to attach' },
					{
						displayName: 'Extra (JSON)',
						name: 'extra',
						type: 'string',
						typeOptions: { rows: 8 },
						default: '',
						description: 'RCS-specific payload as JSON. Structure: {"suggestions":[...],"cards":[...],"alternate":{...}}',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('biwayMessengerApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				let responseData: IDataObject;

				// ── Account > Create ─────────────────────────────────────────
				if (resource === 'account' && operation === 'create') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						username: this.getNodeParameter('username', i),
						password1: this.getNodeParameter('password1', i),
						password2: this.getNodeParameter('password2', i),
					};
					if (extra.customerId && Number(extra.customerId) > 0) {
						body.customer_id = Number(extra.customerId);
					} else if (extra.customerJson) {
						body.customer = parseJsonField(extra.customerJson as string, 'Customer (JSON)');
					}
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/system/account`, body, json: true,
					}) as IDataObject;
				}

				// ── Asset > Upload ────────────────────────────────────────────
				else if (resource === 'asset' && operation === 'upload') {
					const binaryProp = this.getNodeParameter('binaryPropertyName', i) as string;
					const filename = this.getNodeParameter('filename', i) as string;
					const mimeType = this.getNodeParameter('mimeType', i) as string;
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;

					const binaryData = this.helpers.assertBinaryData(i, binaryProp);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);
					const base64Asset = buffer.toString('base64');

					const body: IDataObject = {
						asset: base64Asset,
						mime_type: mimeType,
						filename,
						base64: true,
					};
					if (extra.galleryId && Number(extra.galleryId) > 0) body.gallery_id = Number(extra.galleryId);
					if (extra.comment) body.comment = extra.comment;
					if (extra.returnPath) body.return_path = extra.returnPath;

					void binaryData; // referenced above via assertBinaryData for validation
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/gallery/asset`, body, json: true,
					}) as IDataObject;
				}

				// ── Callback URL > Register ───────────────────────────────────
				else if (resource === 'callbackUrl' && operation === 'register') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						url: this.getNodeParameter('callbackUrl', i),
						event: this.getNodeParameter('event', i),
					};
					if (typeof extra.grouped === 'boolean') body.grouped = extra.grouped;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/system/callback`, body, json: true,
					}) as IDataObject;
				}

				// ── Callback URL > Delete ─────────────────────────────────────
				else if (resource === 'callbackUrl' && operation === 'delete') {
					const id = this.getNodeParameter('callbackUrlId', i) as number;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'DELETE', uri: `${baseUrl}/system/callback/${id}`, json: true,
					}) as IDataObject;
					if (!responseData) responseData = { success: true };
				}

				// ── Chatbot Trigger > Create ──────────────────────────────────
				else if (resource === 'chatbotTrigger' && operation === 'create') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						label: this.getNodeParameter('label', i),
						type: 'keyword',
						keyword: this.getNodeParameter('keyword', i),
						template_id: this.getNodeParameter('templateId', i),
					};
					if (extra.pattern) body.pattern = extra.pattern;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/chatbot/trigger`, body, json: true,
					}) as IDataObject;
				}

				// ── Contact > Create Group ────────────────────────────────────
				else if (resource === 'contact' && operation === 'createGroup') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						group_name: this.getNodeParameter('groupName', i),
						entry_type: 'contact',
					};
					if (extra.comment) body.comment = extra.comment;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/file/group`, body, json: true,
					}) as IDataObject;
				}

				// ── Contact > Import File ─────────────────────────────────────
				else if (resource === 'contact' && operation === 'importFile') {
					const binaryProp = this.getNodeParameter('binaryPropertyName', i) as string;
					const softwareFile = this.getNodeParameter('softwareFile', i) as string;
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;

					const binaryData = this.helpers.assertBinaryData(i, binaryProp);
					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp);

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const formData: Record<string, any> = {
						import: {
							value: buffer,
							options: {
								filename: binaryData.fileName ?? 'import',
								contentType: binaryData.mimeType,
							},
						},
						'software-file': softwareFile,
					};
					if (extra.groupId && Number(extra.groupId) > 0) formData.group_id = String(extra.groupId);
					if (extra.checkDouble) formData.check_double = extra.checkDouble;
					if (extra.doubleKey) formData.double_key = extra.doubleKey;
					if (extra.replaceType) {
						formData['replace-type'] = (extra.replaceType as string)
							.split(',')
							.map((s: string) => s.trim())
							.filter(Boolean);
					}

					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/file/scheduler`, formData,
					}) as IDataObject;
					if (typeof responseData !== 'object') responseData = { task_id: responseData };
				}

				// ── Customer > Create ─────────────────────────────────────────
				else if (resource === 'customer' && operation === 'create') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = { name: this.getNodeParameter('name', i) };
					if (extra.siren && Number(extra.siren) > 0) body.siren = Number(extra.siren);
					if (extra.website) body.website = extra.website;
					if (extra.addressJson) body.address = parseJsonField(extra.addressJson as string, 'Address (JSON)');
					if (extra.contactJson) body.contact = parseJsonField(extra.contactJson as string, 'Contact (JSON)');
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/client/customer`, body, json: true,
					}) as IDataObject;
				}

				// ── Message > Send ────────────────────────────────────────────
				else if (resource === 'message' && operation === 'send') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						channel: this.getNodeParameter('channel', i),
						receiver: this.getNodeParameter('receiver', i),
					};
					if (extra.operationType) body.operation = extra.operationType;
					if (extra.originated) body.originated = extra.originated;
					if (typeof extra.noTemplate === 'boolean') body['no-template'] = extra.noTemplate;
					if (extra.subject) body.subject = extra.subject;
					if (extra.body) body.body = extra.body;
					if (extra.templateId && Number(extra.templateId) > 0) body.template_id = Number(extra.templateId);
					const parts = parseCommaSeparatedIds(extra.parts as string | undefined);
					if (parts?.length) body.parts = parts;
					if (extra.extra) body.extra = parseJsonField(extra.extra as string, 'Extra (JSON)');
					if (extra.date) body.date = extra.date;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/messenger/submit`, body, json: true,
					}) as IDataObject;
				}

				// ── Message > Broadcast ───────────────────────────────────────
				else if (resource === 'message' && operation === 'broadcast') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = { channel: this.getNodeParameter('channel', i) };
					if (extra.title) body.title = extra.title;
					if (typeof extra.simulation === 'boolean') body.simulation = extra.simulation;
					if (extra.priority) body.priority = extra.priority;
					if (extra.subject) body.subject = extra.subject;
					if (extra.body) body.body = extra.body;
					if (extra.templateId && Number(extra.templateId) > 0) body.template_id = Number(extra.templateId);
					if (extra.originated) body.originated = extra.originated;
					const parts = parseCommaSeparatedIds(extra.parts as string | undefined);
					if (parts?.length) body.parts = parts;
					if (extra.extra) body.extra = parseJsonField(extra.extra as string, 'Extra (JSON)');
					if (extra.date) body.date = extra.date;
					if (extra.receivers) {
						body.receivers = (extra.receivers as string).split(',').map((s: string) => s.trim()).filter(Boolean);
					}
					if (extra.groups) body.groups = parseJsonField(extra.groups as string, 'Groups (JSON)');
					if (extra.ignoreGroups) body.ignore_groups = parseJsonField(extra.ignoreGroups as string, 'Ignore Groups (JSON)');
					if (extra.filters) body.filters = parseJsonField(extra.filters as string, 'Filters (JSON)');
					if (typeof extra.segmentation === 'boolean') body.segmentation = extra.segmentation;
					if (extra.segmentDate) body.segment_date = extra.segmentDate;
					if (extra.segmentLength && Number(extra.segmentLength) > 0) body.segment_length = Number(extra.segmentLength);
					if (extra.segmentInterval && Number(extra.segmentInterval) > 0) body.segment_interval = Number(extra.segmentInterval);
					if (extra.segmentIntervalUnit) body.segment_interval_unit = extra.segmentIntervalUnit;
					if (typeof extra.segmentWeekendIncluded === 'boolean') body.segment_weekend_included = extra.segmentWeekendIncluded;
					if (extra.segmentOpenPeriodBegin) body.segment_open_period_begin = extra.segmentOpenPeriodBegin;
					if (extra.segmentOpenPeriodEnd) body.segment_open_period_end = extra.segmentOpenPeriodEnd;
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/messenger/broadcast`, body, json: true,
					}) as IDataObject;
				}

				// ── RCS Agent > Declare ───────────────────────────────────────
				else if (resource === 'rcsAgent' && operation === 'declare') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						name: this.getNodeParameter('agentName', i),
						description: this.getNodeParameter('agentDescription', i),
						color: this.getNodeParameter('color', i),
						logo: this.getNodeParameter('logo', i),
						cover: this.getNodeParameter('cover', i),
						privacy_url: this.getNodeParameter('privacyUrl', i),
						conditions_url: this.getNodeParameter('conditionsUrl', i),
						contact_phone: this.getNodeParameter('contactPhone', i),
						contact_email: this.getNodeParameter('contactEmail', i),
						contact_url: this.getNodeParameter('contactUrl', i),
					};
					if (extra.preview && Number(extra.preview) > 0) body.preview = Number(extra.preview);
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/chatbot/agent`, body, json: true,
					}) as IDataObject;
				}

				// ── Template > Create ─────────────────────────────────────────
				else if (resource === 'template' && operation === 'create') {
					const extra = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						comment: this.getNodeParameter('comment', i),
						format: this.getNodeParameter('format', i),
					};
					if (extra.subject) body.subject = extra.subject;
					if (extra.body) body.body = extra.body;
					const parts = parseCommaSeparatedIds(extra.parts as string | undefined);
					if (parts?.length) body.parts = parts;
					if (extra.extra) body.extra = parseJsonField(extra.extra as string, 'Extra (JSON)');
					responseData = await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
						method: 'POST', uri: `${baseUrl}/messenger/template`, body, json: true,
					}) as IDataObject;
				}

				else {
					throw new NodeOperationError(this.getNode(), `Unknown resource/operation: ${resource}/${operation}`);
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
