import type { INodeProperties } from 'n8n-workflow';

const showFor = (operation: string[]) => ({ show: { resource: ['scenario'], operation } });

export const scenarioOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['scenario'] } },
		options: [
			{
				name: 'Activate',
				value: 'activate',
				description: 'Turn an RCS scenario on',
				action: 'Activate RCS scenario',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new RCS scenario starting with a message template',
				action: 'Create RCS scenario',
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				description: 'Turn an RCS scenario off without deleting it',
				action: 'Deactivate RCS scenario',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove an RCS scenario from your Bi-Way account',
				action: 'Delete RCS scenario',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an RCS scenario and its steps',
				action: 'Get RCS scenario',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of RCS scenarios',
				action: 'Get many RCS scenarios',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Send the first message of an RCS scenario to a recipient',
				action: 'Start RCS scenario',
			},
		],
		default: 'create',
	},
];

const scenarioIdField: INodeProperties = {
	displayName: 'Scenario Name or ID',
	name: 'scenarioId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getScenarios' },
	required: true,
	default: '',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	displayOptions: showFor(['activate', 'deactivate', 'delete', 'get', 'start']),
};

export const scenarioFields: INodeProperties[] = [
	{
		displayName:
			'RCS scenarios reach phones on French mobile operators only. A scenario starts with a message template whose RCS Suggested Reply buttons carry keywords. Each keyword leads to the next step through an RCS Agent › Create Keyword Reply that sends another template. To take over the conversation in n8n, catch the keywords of the last buttons with the Bi-Way SMS/RCS Trigger (Button Keywords option).',
		name: 'scenarioNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['create', 'start']),
	},
	scenarioIdField,

	// ── Create ───────────────────────────────────────────────────────────────────────────────────
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the scenario in your Bi-Way account',
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'First Template Name or ID',
		name: 'templateId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTemplates' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'First message of the scenario. Its Suggested Reply buttons lead to the next steps.',
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['create']),
		options: [
			{
				displayName: 'Activate',
				name: 'activate',
				type: 'boolean',
				default: true,
				description: 'Whether to activate the scenario as soon as it is created',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Internal note about the scenario',
			},
		],
	},

	// ── Get Many ─────────────────────────────────────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: showFor(['getAll']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...showFor(['getAll']).show, returnAll: [false] } },
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: showFor(['create', 'get', 'getAll']),
	},

	// ── Start ────────────────────────────────────────────────────────────────────────────────────
	{
		displayName: 'Recipient',
		name: 'receiver',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. +33612345678',
		description: 'Phone number of the recipient, in international format',
		displayOptions: showFor(['start']),
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channel',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		default: 'rcs',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'Scenarios need RCS: the buttons only exist on the RCS channel',
		displayOptions: showFor(['start']),
	},
];
