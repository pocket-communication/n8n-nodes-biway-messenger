import type { INodeProperties } from 'n8n-workflow';

import { contactGroupLocator } from './ResourceLocators';

const showFor = (operation: string[]) => ({ show: { resource: ['contact'], operation } });

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact, or reuse the one with the same phone number',
				action: 'Create contact',
			},
			{
				name: 'Create Group',
				value: 'createGroup',
				description: 'Create a new contact group',
				action: 'Create contact group',
			},
			{
				name: 'Import File',
				value: 'importFile',
				description: 'Import contacts from a CSV or Excel file',
				action: 'Import contact file',
			},
		],
		default: 'createGroup',
	},
];

const contactGroupOption = contactGroupLocator();

export const contactFields: INodeProperties[] = [
	// ── Create ───────────────────────────────────────────────────────────────────────────────────
	{
		displayName:
			'The columns come from your Bi-Way account. Write phone numbers in international format (e.g. +33612345678). A contact belongs to one contact group.',
		name: 'createNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Columns',
		name: 'contactColumns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['operation'],
			resourceMapper: {
				resourceMapperMethod: 'getContactColumns',
				mode: 'add',
				fieldWords: { singular: 'column', plural: 'columns' },
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: true,
			},
		},
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'If Contact Already Exists',
		name: 'ifExists',
		type: 'options',
		options: [
			{
				name: 'Create Another',
				value: 'create',
				description: 'Create a new contact without looking for an existing one',
			},
			{
				name: 'Fail',
				value: 'fail',
				description: 'Stop with an error naming the existing contact',
			},
			{
				name: 'Update It',
				value: 'update',
				description: 'Write the mapped columns on the existing contact',
			},
			{
				name: 'Use Existing',
				value: 'useExisting',
				description:
					'Return the existing contact unchanged, so that running the workflow again creates no duplicate',
			},
		],
		default: 'useExisting',
		description:
			'What to do when a contact of your account has the same phone number. Bi-Way compares the numbers exactly.',
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
				...contactGroupOption,
				hint: 'Group of the new contact. Leave empty to use your default group.',
			},
		],
	},

	// ── Create Group ─────────────────────────────────────────────────────────────────────────────
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['createGroup']),
	},
	{
		displayName: 'If Name Already Exists',
		name: 'ifExists',
		type: 'options',
		options: [
			{
				name: 'Create Another',
				value: 'create',
				description: 'Create a new group with the same name',
			},
			{
				name: 'Fail',
				value: 'fail',
				description: 'Stop with an error naming the existing group',
			},
			{
				name: 'Use Existing',
				value: 'useExisting',
				description:
					'Return the existing group instead of creating one, so that running the workflow again creates no duplicate',
			},
		],
		default: 'useExisting',
		description:
			'What to do when a contact group with the same name already exists (names are compared ignoring case and surrounding spaces)',
		displayOptions: showFor(['createGroup']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['createGroup']),
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Internal note about the group',
			},
		],
	},

	// ── Import File ──────────────────────────────────────────────────────────────────────────────
	{
		displayName:
			"The import runs in the background: this node returns the ID of the import task. Use the Bi-Way SMS/RCS Trigger node with the 'Contact Import State Changed' event to know when it is finished.",
		name: 'importNotice',
		type: 'notice',
		default: '',
		displayOptions: showFor(['importFile']),
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the file to import',
		displayOptions: showFor(['importFile']),
	},
	{
		displayName: 'File Format',
		name: 'fileFormat',
		type: 'options',
		options: [
			{
				name: 'Automatic',
				value: '',
				description: 'Bi-Way picks the import format of your account matching the file',
			},
			{ name: 'CSV', value: 'CSVFile' },
			{ name: 'Excel 2007+ (XLSX)', value: 'XlsxFile' },
			{ name: 'Excel 97-2003 (XLS)', value: 'XlsFile' },
		],
		default: '',
		displayOptions: showFor(['importFile']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['importFile']),
		options: [
			{
				...contactGroupOption,
				hint: 'Group to import the contacts into. Leave empty to use your default group.',
			},
			{
				displayName: 'Duplicate Handling',
				name: 'checkDouble',
				type: 'options',
				options: [
					{
						name: 'Add Without Check',
						value: 'none',
						description: 'Import every row as a new contact',
					},
					{
						name: 'Deduplicate Within the Account',
						value: 'account',
						description:
							'Do not import again the contacts that already exist in the account, recognized by the duplicate key column',
					},
					{
						name: 'Deduplicate Within the Group',
						value: 'group',
						description:
							'Do not import again the contacts that already exist in the group, recognized by the duplicate key column',
					},
					{
						name: 'Disable the Contacts of the File',
						value: 'unsubscribe',
						description: 'Disable the existing contacts listed in the file',
					},
					{
						name: 'Enable the Contacts of the File',
						value: 'subscribe',
						description: 'Enable again the existing contacts listed in the file',
					},
					{
						name: 'Synchronize With the Account',
						value: 'account-sync',
						description:
							'Update the contacts of the account that already exist with the content of the file',
					},
					{
						name: 'Synchronize With the Group',
						value: 'group-sync',
						description:
							'Update the contacts of the group that already exist with the content of the file',
					},
				],
				default: 'none',
			},
			{
				displayName: 'Duplicate Key Column',
				name: 'doubleKeyColumn',
				type: 'string',
				default: '',
				placeholder: 'e.g. phone',
				description: 'Column used to recognize a contact that already exists',
			},
			{
				displayName: 'Replace Data Types',
				name: 'replaceTypes',
				type: 'string',
				default: '',
				placeholder: 'e.g. contact',
				description:
					'Comma-separated data types whose existing records are replaced by the content of the file',
			},
		],
	},
];
