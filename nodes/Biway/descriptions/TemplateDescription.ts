import type { INodeProperties } from 'n8n-workflow';

const showForCreate = { show: { resource: ['template'], operation: ['create'] } };

export const templateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['template'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message template',
				action: 'Create a template',
			},
		],
		default: 'create',
	},
];

export const templateFields: INodeProperties[] = [
	{
		displayName:
			'Text templates need a body. HTML templates need a subject and a body, and are the only ones that keep attachments. Card templates (RCS rich cards) need a "cards" array in Extra (JSON).',
		name: 'templateNotice',
		type: 'notice',
		default: '',
		displayOptions: showForCreate,
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the template in your Bi-Way account',
		displayOptions: showForCreate,
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'Card (RCS)', value: 'card', description: 'RCS rich cards' },
			{ name: 'HTML', value: 'html', description: 'Email with a subject and attachments' },
			{ name: 'Media', value: 'media', description: 'Message built around a media file' },
			{ name: 'Text', value: 'text', description: 'Plain text message' },
		],
		default: 'text',
		displayOptions: showForCreate,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		description: 'Subject of the message. Required for HTML templates.',
		displayOptions: showForCreate,
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Content of the message. Required for text and HTML templates.',
		displayOptions: showForCreate,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showForCreate,
		options: [
			{
				displayName: 'Attachment Asset IDs',
				name: 'assetIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1234, 1235',
				description:
					'Comma-separated IDs of files of your Bi-Way gallery. Only HTML templates keep them.',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Internal note about the template',
			},
			{
				displayName: 'Extra (JSON)',
				name: 'extra',
				type: 'json',
				default: '{}',
				description:
					'Channel-specific content: RCS suggestions, rich cards, alternative SMS. See https://services.bi-way.fr/openapi/.',
			},
		],
	},
];
