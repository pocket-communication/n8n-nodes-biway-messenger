import type { INodeProperties } from 'n8n-workflow';

import {
	contentField,
	rcsButtonsField,
	rcsCardFields,
	rcsCarouselField,
} from './RcsContentDescription';

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
				description: 'Create a new message template',
				action: 'Create template',
			},
		],
		default: 'create',
	},
];

export const templateFields: INodeProperties[] = [
	{
		displayName:
			'Text templates need a body and may carry RCS buttons. Card and carousel templates are RCS rich cards (RCS is currently available on French mobile operators only). To build an RCS scenario, give the template Suggested Reply buttons and create a keyword reply for each keyword.',
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
	contentField(showForCreate),
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description:
			'Text of the message. Personalization tags of Bi-Way work for contacts and contact groups.',
		displayOptions: { show: { ...showForCreate.show, content: ['text'] } },
	},
	...rcsCardFields({ ...showForCreate.show, content: ['card'] }),
	rcsCarouselField({ ...showForCreate.show, content: ['carousel'] }),
	rcsButtonsField({ ...showForCreate.show, content: ['text', 'card'] }),
	{
		displayName: 'If Name Already Exists',
		name: 'ifExists',
		type: 'options',
		options: [
			{
				name: 'Create Another',
				value: 'create',
				description: 'Create a new template with the same title',
			},
			{
				name: 'Fail',
				value: 'fail',
				description: 'Stop with an error naming the existing template',
			},
			{
				name: 'Use Existing',
				value: 'useExisting',
				description:
					'Return the existing template instead of creating one, so that running the workflow again creates no duplicate',
			},
		],
		default: 'useExisting',
		description:
			'What to do when a template with the same title already exists (titles are compared ignoring case and surrounding spaces)',
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
					'Advanced: extra content of the template, such as the alternative SMS ({"alternate": {...}}). The card, carousel and RCS Buttons fields fill "cards" and "suggestions" for you. See https://services.bi-way.fr/openapi/.',
			},
		],
	},
];
