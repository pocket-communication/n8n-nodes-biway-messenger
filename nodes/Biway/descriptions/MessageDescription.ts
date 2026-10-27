import type { INodeProperties } from 'n8n-workflow';

import { rcsButtonsField, rcsCardFields } from './RcsContentDescription';
import { contactGroupLocator, templateLocator } from './ResourceLocators';

const showFor = (operation: string[]) => ({ show: { resource: ['message'], operation } });

/** RCS channels of Bi-Way: rcs, and any channel whose name contains it. */
const rcsChannel = { channel: [{ _cnd: { includes: 'rcs' } }] };

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
				action: 'Broadcast message',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message to one recipient',
				action: 'Send message',
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
			{
				name: 'RCS Card',
				value: 'card',
				description: 'A rich card with a title, a text, an image and buttons (RCS channel only)',
			},
			{
				name: 'Template',
				value: 'template',
				description: 'Use a message template of your Bi-Way account',
			},
			{ name: 'Text', value: 'text', description: 'Write the message in this node' },
		],
		default: 'text',
		displayOptions: showFor(['send', 'broadcast']),
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		description: 'Subject of an MMS. SMS and RCS messages have none: leave it empty.',
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
	templateLocator('Template', {
		required: true,
		typeOptions: { loadOptionsDependsOn: ['channel'] },
		hint: 'Only the templates the chosen channel can carry are listed: no RCS card or button outside RCS, no subject or attachment on an SMS',
		displayOptions: {
			show: { ...showFor(['send', 'broadcast']).show, contentSource: ['template'] },
		},
	}),
	...rcsCardFields({
		...showFor(['send', 'broadcast']).show,
		...rcsChannel,
		contentSource: ['card'],
	}),
	rcsButtonsField({
		...showFor(['send', 'broadcast']).show,
		...rcsChannel,
		contentSource: ['text', 'card'],
	}),
	// Also offered with templates: Bi-Way keeps the request's "alternate" on top of the template's RCS content.
	{
		displayName: 'If the Phone Is Not RCS-Capable',
		name: 'rcsFallback',
		type: 'options',
		options: [
			{
				name: "Send the Account's Fallback SMS",
				value: 'account',
				description: 'The fallback SMS set in your Bi-Way account',
			},
			{
				name: 'Send Nothing',
				value: 'none',
				description:
					"No SMS: the 'Message Status Updated' event reports 'unsupported', so a workflow can decide what to do",
			},
			{
				name: 'Send This SMS',
				value: 'custom',
				description: 'Write the fallback SMS in this node',
			},
		],
		default: 'account',
		description:
			'What Bi-Way does when the phone cannot receive RCS (not RCS-capable, or not on a French mobile operator)',
		displayOptions: {
			show: {
				...showFor(['send', 'broadcast']).show,
				...rcsChannel,
				contentSource: ['text', 'card', 'template'],
			},
		},
	},
	{
		displayName: 'Fallback SMS Text',
		name: 'rcsFallbackText',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description:
			'SMS sent instead of the RCS message, 160 characters at most including the STOP mention and the chat link when they are added',
		displayOptions: {
			show: {
				...showFor(['send', 'broadcast']).show,
				...rcsChannel,
				contentSource: ['text', 'card', 'template'],
				rcsFallback: ['custom'],
			},
		},
	},
	{
		displayName: 'Fallback SMS Options',
		name: 'rcsFallbackOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				...showFor(['send', 'broadcast']).show,
				...rcsChannel,
				contentSource: ['text', 'card', 'template'],
				rcsFallback: ['custom'],
			},
		},
		options: [
			{
				displayName: 'Add Chat Link',
				name: 'chatUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to add a link to continue the conversation in the Bi-Way web chat',
			},
			{
				displayName: 'Add STOP Mention',
				name: 'stop',
				type: 'boolean',
				default: true,
				description:
					'Whether to add the STOP opt-out mention, required in France for marketing messages',
			},
			{
				displayName: 'RCS Expiry (Hours)',
				name: 'expireHours',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 6,
				description: 'Hours after which an RCS message not yet delivered expires',
			},
			{
				displayName: 'Sender',
				name: 'sender',
				type: 'string',
				default: '',
				placeholder: 'e.g. MYBRAND',
				description:
					'Sender shown on the SMS, 11 characters at most. Leave empty to use the default SMS sender of your account.',
			},
		],
	},
];

const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Extra (JSON)',
		name: 'extra',
		type: 'json',
		default: '{}',
		description:
			'Advanced: channel-specific content keyed by the channel name, for example {"rcs": {"alternate": {...}}}. The RCS Card content and the RCS Buttons field fill the "rcs" entry for you. See https://services.bi-way.fr/openapi/.',
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
			'Sending needs a Bi-Way plan with API access (<a href="https://v3.bi-way.fr/signup" target="_blank">sign up</a>). Only the channels enabled on your account work. RCS also needs a launched RCS agent (check it with RCS Agent › Get Status) and is currently available on French mobile operators only.',
		name: 'sendNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['send']),
	},
	{
		displayName:
			'Broadcast sends one message to many recipients. Phone numbers typed here are not saved as contacts, so personalization tags only work for contacts and contact groups.',
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
		description: 'Phone number of the recipient, in international format',
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
				displayName: 'Phone Number',
				name: 'addresses',
				values: [
					{
						displayName: 'Phone Number',
						name: 'address',
						type: 'string',
						default: '',
						placeholder: 'e.g. +33612345678',
						description: 'Phone number in international format',
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
				values: [contactGroupLocator()],
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
				displayName: 'Additional Phone Numbers',
				name: 'bulkAddresses',
				type: 'string',
				default: '',
				placeholder: 'e.g. +33612345678, +33698765432',
				description:
					'Phone numbers separated by commas or new lines. You can also map an array with an expression.',
			},
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
			sharedOptions[0],
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
			sharedOptions[1],
			sharedOptions[2],
			{
				displayName: 'Simulate',
				name: 'simulation',
				type: 'boolean',
				default: false,
				description:
					'Whether to only simulate the sending: Bi-Way counts the recipients without sending anything',
			},
			sharedOptions[3],
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
					"Status reports to collect. They are sent to the Bi-Way SMS/RCS Trigger node ('Message Status Updated' event).",
			},
			sharedOptions[4],
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
