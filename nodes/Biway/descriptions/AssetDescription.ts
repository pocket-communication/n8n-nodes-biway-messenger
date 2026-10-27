import type { INodeProperties } from 'n8n-workflow';

const showForUpload = { show: { resource: ['asset'], operation: ['upload'] } };

export const assetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['asset'] } },
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file to your Bi-Way gallery',
				action: 'Upload asset',
			},
		],
		default: 'upload',
	},
];

export const assetFields: INodeProperties[] = [
	{
		displayName:
			'Uploads a file to your Bi-Way gallery, to attach it to messages and templates. Maximum 2 MB for images and documents, 30 MB for videos. Executable files are refused.',
		name: 'assetNotice',
		type: 'notice',
		default: '',
		displayOptions: showForUpload,
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the file to upload',
		displayOptions: showForUpload,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showForUpload,
		options: [
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'Description of the file in the gallery',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. summer-offer.jpg',
				description:
					'Name of the file in the gallery. Defaults to the name of the binary file. Bi-Way replaces characters other than letters, digits, dots, dashes and underscores.',
			},
			{
				displayName: 'Gallery ID',
				name: 'galleryId',
				type: 'number',
				default: 0,
				description: 'ID of one of your galleries. Leave 0 to use your default gallery.',
			},
			{
				displayName: 'Private',
				name: 'private',
				type: 'boolean',
				default: false,
				description: 'Whether to mark the file as private in your Bi-Way gallery',
			},
		],
	},
];
