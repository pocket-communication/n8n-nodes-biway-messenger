import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Create Group',
				value: 'createGroup',
				description: 'Create a contact group',
				action: 'Create a contact group',
			},
			{
				name: 'Import File',
				value: 'importFile',
				description: 'Import contacts from a CSV or Excel file',
				action: 'Import a contact file',
			},
		],
		default: 'createGroup',
	},
];

export const contactFields: INodeProperties[] = [
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
			'The import runs in the background: this node returns the ID of the import task. Use the Bi-Way Trigger node with the "Contact Import State Changed" event to know when it is finished.',
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
				displayName: 'Contact Group Name or ID',
				name: 'groupId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getContactGroups' },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
