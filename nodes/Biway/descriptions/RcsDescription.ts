import type { INodeProperties } from 'n8n-workflow';

import { templateLocator } from './ResourceLocators';

const showFor = (operation: string[]) => ({ show: { resource: ['rcs'], operation } });

export const rcsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['rcs'] } },
		options: [
			{
				name: 'Create Keyword Reply',
				value: 'createKeywordReply',
				description: 'Reply automatically when a customer taps an RCS button that carries a keyword',
				action: 'Create RCS keyword reply',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the state of your RCS declaration and of your RCS agent at each operator',
				action: 'Get RCS agent status',
			},
		],
		default: 'getStatus',
	},
];

export const rcsFields: INodeProperties[] = [
	{
		displayName:
			'RCS needs an RCS agent declared by your company and launched by the mobile operators. Declare it on <a href="https://app.bi-way.fr/rcs-registration/" target="_blank">the RCS declaration form</a> or in <a href="https://v3.bi-way.fr/settings/chatbot" target="_blank">your Bi-Way RCS settings</a> (a declaration fee applies). RCS is currently available on French mobile operators only.',
		name: 'rcsNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['createKeywordReply', 'getStatus']),
	},

	// ── Create Keyword Reply ─────────────────────────────────────────────────────────────────────
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the keyword reply in your Bi-Way account',
		displayOptions: showFor(['createKeywordReply']),
	},
	{
		displayName: 'Keyword',
		name: 'keyword',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. PROMO',
		description:
			'Keyword of the Suggested Reply buttons that trigger the reply: give the buttons this same keyword. A word typed by the customer does not trigger it. Bi-Way converts the keyword to upper case and replaces spaces and special characters with underscores. It must be unique on your account.',
		displayOptions: showFor(['createKeywordReply']),
	},
	templateLocator('Reply Template', {
		required: true,
		hint: 'Message template sent as the reply',
		displayOptions: showFor(['createKeywordReply']),
	}),
	{
		displayName: 'If Keyword Already Exists',
		name: 'ifExists',
		type: 'options',
		options: [
			{
				name: 'Fail',
				value: 'fail',
				description: 'Stop with an error naming the existing keyword reply',
			},
			{
				name: 'Use Existing',
				value: 'useExisting',
				description:
					'Return the existing keyword reply unchanged, so that running the workflow again creates no duplicate',
			},
		],
		default: 'useExisting',
		description:
			'What to do when your account already has a keyword reply with this keyword. Bi-Way allows one reply per keyword.',
		displayOptions: showFor(['createKeywordReply']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['createKeywordReply']),
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: true,
				description: 'Whether the keyword reply is active as soon as it is created',
			},
			{
				displayName: 'Personalization Pattern',
				name: 'pattern',
				type: 'string',
				default: '',
				placeholder: 'e.g. (contact:1234)',
				description:
					'Record used to personalize the reply, written (type:record ID) or (type:record ID,owner.column)',
			},
		],
	},
];
