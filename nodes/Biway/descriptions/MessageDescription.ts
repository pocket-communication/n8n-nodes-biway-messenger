import type { INodeProperties } from 'n8n-workflow';

const showFor = (operation: string[]) => ({ show: { resource: ['message'], operation } });

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Broadcast',
				value: 'broadcast',
				description: 'Send a message to several recipients and contact groups',
				action: 'Broadcast a message',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message to one recipient',
				action: 'Send a message',
			},
		],
		default: 'send',
	},
];

const contentFields: INodeProperties[] = [
	{
		displayName: 'Channel Name or ID',
		name: 'channel',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Only the channels enabled on your Bi-Way account are listed',
		displayOptions: showFor(['send', 'broadcast']),
	},
	{
		displayName: 'Content',
		name: 'contentSource',
		type: 'options',
		options: [
			{ name: 'Text', value: 'text', description: 'Write the message in this node' },
			{
				name: 'Template',
				value: 'template',
				description: 'Use a message template of your Bi-Way account',
			},
		],
		default: 'text',
		displayOptions: showFor(['send', 'broadcast']),
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		description: 'Subject of the message, for the channels that support one, such as email',
		displayOptions: { show: { ...showFor(['send', 'broadcast']).show, contentSource: ['text'] } },
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description:
			'Text of the message. Personalization tags of Bi-Way work for contacts and contact groups.',
		displayOptions: { show: { ...showFor(['send', 'broadcast']).show, contentSource: ['text'] } },
	},
	{
		displayName: 'Template Name or ID',
		name: 'templateId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: { ...showFor(['send', 'broadcast']).show, contentSource: ['template'] },
		},
	},
];

const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Attachment Asset IDs',
		name: 'assetIds',
		type: 'string',
		default: '',
		placeholder: 'e.g. 1234, 1235',
		description:
			'Comma-separated IDs of files of your Bi-Way gallery, as returned by Asset › Upload',
	},
	{
		displayName: 'Extra (JSON)',
		name: 'extra',
		type: 'json',
		default: '{}',
		description:
			'Channel-specific content, such as RCS suggestions and rich cards, or the alternative SMS. See https://services.bi-way.fr/openapi/.',
	},
	{
		displayName: 'Send At',
		name: 'sendAt',
		type: 'dateTime',
		default: '',
		description:
			'Date and time to send the message. Leave empty to send it now. Bi-Way schedules to the minute, in the Europe/Paris time zone.',
	},
	{
		displayName: 'Sender Name or ID',
		name: 'sender',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSenders', loadOptionsDependsOn: ['channel'] },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Sender shown to the recipient, for the channels that support one. Leave empty to use the default sender of your account.',
	},
	{
		displayName: 'Skip Account Layout',
		name: 'skipAccountLayout',
		type: 'boolean',
		default: false,
		description: 'Whether to send the body as is, without the message layout of your account',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Title of the sending in the Bi-Way message history',
	},
];

export const messageFields: INodeProperties[] = [
	// ── Send ─────────────────────────────────────────────────────────────────────────────────────
	{
		displayName:
			'Sending needs a Bi-Way plan with API access (<a href="https://v3.bi-way.fr/signup" target="_blank">sign up</a>). Only the channels enabled on your account work. RCS also needs a launched RCS agent: check it with RCS › Get Status.',
		name: 'sendNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['send']),
	},
	{
		displayName:
			'Broadcast sends one message to many recipients. Addresses typed here are not saved as contacts, so personalization tags only work for contacts and contact groups.',
		name: 'broadcastNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['broadcast']),
	},
	...contentFields,
	{
		displayName: 'Recipient',
		name: 'receiver',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. +33612345678',
		description:
			'Phone number in international format for SMS and RCS channels, or email address for email channels',
		displayOptions: showFor(['send']),
	},
	{
		displayName: 'Recipients',
		name: 'recipients',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Recipient',
		default: {},
		displayOptions: showFor(['broadcast']),
		options: [
			{
				displayName: 'Address',
				name: 'addresses',
				values: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						placeholder: 'e.g. +33612345678',
						description: 'Phone number in international format, or email address',
					},
				],
			},
			{
				displayName: 'Contact',
				name: 'contacts',
				values: [
					{
						displayName: 'Contact ID',
						name: 'contactId',
						type: 'number',
						default: 0,
						description: 'ID of a contact of your Bi-Way account',
					},
				],
			},
			{
				displayName: 'Contact Group',
				name: 'groups',
				values: [
					{
						displayName: 'Contact Group Name or ID',
						name: 'groupId',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getContactGroups' },
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['send']),
		options: sharedOptions,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['broadcast']),
		options: [
			{
				displayName: 'Additional Addresses',
				name: 'bulkAddresses',
				type: 'string',
				default: '',
				placeholder: 'e.g. +33612345678, +33698765432',
				description:
					'Phone numbers or email addresses separated by commas or new lines. You can also map an array with an expression.',
			},
			sharedOptions[0],
			{
				displayName: 'Exclude Contact Group Names or IDs',
				name: 'excludeGroupIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getContactGroups' },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Contacts of these groups do not receive the message',
			},
			sharedOptions[1],
			{
				displayName: 'Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '[]',
				description:
					'Conditions applied to the contacts of the groups, as described in https://services.bi-way.fr/openapi/',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{ name: 'Normal', value: 'normal' },
					{
						name: 'Urgent',
						value: 'urgent',
						description: 'Sent at once when there are 5 recipients or fewer and no send date',
					},
				],
				default: 'normal',
			},
			sharedOptions[2],
			sharedOptions[3],
			{
				displayName: 'Simulate',
				name: 'simulation',
				type: 'boolean',
				default: false,
				description:
					'Whether to only simulate the sending: Bi-Way counts the recipients without sending anything',
			},
			sharedOptions[4],
			{
				displayName: 'Status Reports',
				name: 'report',
				type: 'options',
				options: [
					{ name: 'All', value: 'all', description: 'Delivery and read reports' },
					{ name: 'Delivery', value: 'delivery', description: 'Delivery reports only' },
					{ name: 'None', value: 'none', description: 'No status report' },
					{ name: 'Read', value: 'read', description: 'Read reports only' },
				],
				default: 'all',
				description:
					'Status reports to collect. They are sent to the Bi-Way Trigger node ("Message Status Updated" event).',
			},
			sharedOptions[5],
		],
	},
	{
		displayName: 'Segmentation',
		name: 'segmentation',
		type: 'collection',
		placeholder: 'Add Segmentation Setting',
		default: {},
		description:
			'Split the sending into segments sent at intervals. Adding any setting turns segmentation on.',
		displayOptions: showFor(['broadcast']),
		options: [
			{
				displayName: 'First Segment At',
				name: 'segmentDate',
				type: 'dateTime',
				default: '',
				description: 'Date and time of the first segment (Europe/Paris time zone)',
			},
			{
				displayName: 'Include Weekends',
				name: 'weekendIncluded',
				type: 'boolean',
				default: false,
				description: 'Whether segments may be sent on Saturdays and Sundays',
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Time between two segments, in the interval unit',
			},
			{
				displayName: 'Interval Unit',
				name: 'intervalUnit',
				type: 'options',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Hour', value: 'hour' },
				],
				default: 'day',
			},
			{
				displayName: 'Segment Size',
				name: 'length',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				description: 'Number of recipients per segment',
			},
			{
				displayName: 'Sending Hours End',
				name: 'openPeriodEnd',
				type: 'string',
				default: '',
				placeholder: 'e.g. 18:00',
				description: 'End of the sending hours (HH:mm). Required with the Hour unit.',
			},
			{
				displayName: 'Sending Hours Start',
				name: 'openPeriodBegin',
				type: 'string',
				default: '',
				placeholder: 'e.g. 09:00',
				description: 'Start of the sending hours (HH:mm). Required with the Hour unit.',
			},
		],
	},
];
