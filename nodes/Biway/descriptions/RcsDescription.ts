import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Reply automatically when a customer sends a keyword to your RCS agent',
				action: 'Create a keyword reply',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the state of your RCS declaration and of your RCS agent at each operator',
				action: 'Get the RCS status',
			},
		],
		default: 'getStatus',
	},
];

export const rcsFields: INodeProperties[] = [
	{
		displayName:
			'RCS needs an RCS agent declared by your company and launched by the mobile operators. Declare it on <a href="https://app.bi-way.fr/rcs-registration/" target="_blank">the RCS declaration form</a> or in <a href="https://v3.bi-way.fr/settings/chatbot" target="_blank">your Bi-Way RCS settings</a> (a declaration fee applies).',
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
			'Word a customer sends to get the reply. Bi-Way converts it to upper case and replaces spaces and special characters with underscores. It must be unique on your account.',
		displayOptions: showFor(['createKeywordReply']),
	},
	{
		displayName: 'Reply Template Name or ID',
		name: 'templateId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Message template sent as the reply',
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
