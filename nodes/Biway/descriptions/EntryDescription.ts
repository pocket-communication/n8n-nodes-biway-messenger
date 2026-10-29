import type { INodeProperties } from 'n8n-workflow';

const showForGet = { show: { resource: ['entry'], operation: ['get'] } };

export const entryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['entry'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Get a record of your Bi-Way account by its type and ID: a booking, a contact, a form entry…',
				action: 'Get an entry',
			},
		],
		default: 'get',
	},
];

export const entryFields: INodeProperties[] = [
	{
		displayName:
			'For a share request received by the Bi-Way Trigger, use the type and ID of its <code>entry</code> object: the booking, the record sent through a form, the item chosen in a list or the contact.',
		name: 'entryNotice',
		type: 'notice',
		default: '',
		displayOptions: showForGet,
	},
	{
		displayName: 'Entry Type',
		name: 'entryType',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. booking',
		description: "Type of the record, as Bi-Way names it: 'booking', 'contact'…",
		displayOptions: showForGet,
	},
	{
		displayName: 'Entry ID',
		name: 'entryId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1234',
		description: 'ID of the record',
		displayOptions: showForGet,
	},
];
