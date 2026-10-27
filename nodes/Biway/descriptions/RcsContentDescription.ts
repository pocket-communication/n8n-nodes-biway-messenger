import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

type Show = NonNullable<IDisplayOptions['show']>;

/**
 * Fields of an RCS rich card, shared by Template › Create and Message › Send / Broadcast.
 */
export function rcsCardFields(show: Show): INodeProperties[] {
	const displayOptions = { show };
	return [
		{
			displayName: 'Card Title',
			name: 'cardTitle',
			type: 'string',
			default: '',
			description: 'Title of the RCS card, 200 characters at most',
			displayOptions,
		},
		{
			displayName: 'Card Text',
			name: 'cardText',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			description: 'Text of the RCS card, 2000 characters at most',
			displayOptions,
		},
		{
			displayName: 'Card Image',
			name: 'cardImage',
			type: 'options',
			options: [
				{
					name: 'From a URL',
					value: 'url',
					description: 'Public HTTPS address of an image or a video',
				},
				{
					name: 'From the Bi-Way Gallery',
					value: 'gallery',
					description: 'Image or video of your Bi-Way gallery',
				},
				{ name: 'None', value: 'none' },
			],
			default: 'none',
			displayOptions,
		},
		{
			displayName: 'Image Name or ID',
			name: 'cardImageId',
			type: 'options',
			typeOptions: { loadOptionsMethod: 'getGalleryImages' },
			required: true,
			default: '',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			hint: 'To use a file uploaded earlier in the workflow, map the "id" returned by Asset › Upload. The file must be public in the gallery.',
			displayOptions: { show: { ...show, cardImage: ['gallery'] } },
		},
		{
			displayName: 'Image URL',
			name: 'cardImageUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. https://example.com/image.jpg',
			description: 'Public HTTPS address of the image or video',
			displayOptions: { show: { ...show, cardImage: ['url'] } },
		},
		{
			displayName: 'Image MIME Type',
			name: 'cardImageMimeType',
			type: 'string',
			default: 'image/jpeg',
			placeholder: 'e.g. image/png',
			description: 'Type of the file found at the image URL',
			displayOptions: { show: { ...show, cardImage: ['url'] } },
		},
		{
			displayName: 'Image Height',
			name: 'cardImageHeight',
			type: 'options',
			options: [
				{ name: 'Medium', value: 'MEDIUM' },
				{ name: 'Short', value: 'SHORT' },
				{ name: 'Tall', value: 'TALL' },
			],
			default: 'MEDIUM',
			description: 'Height of the image in a vertical card',
			displayOptions: { show: { ...show, cardImage: ['gallery', 'url'] } },
		},
		{
			displayName: 'Card Orientation',
			name: 'cardOrientation',
			type: 'options',
			options: [
				{ name: 'Horizontal', value: 'HORIZONTAL', description: 'Image beside the text' },
				{ name: 'Vertical', value: 'VERTICAL', description: 'Image above the text' },
			],
			default: 'VERTICAL',
			displayOptions,
		},
		{
			displayName: 'Image Alignment',
			name: 'cardImageAlignment',
			type: 'options',
			options: [
				{ name: 'Left', value: 'LEFT' },
				{ name: 'Right', value: 'RIGHT' },
			],
			default: 'LEFT',
			description: 'Side of the image in a horizontal card',
			displayOptions: { show: { ...show, cardOrientation: ['HORIZONTAL'] } },
		},
	];
}

/** Label of a button, common to every kind of button. */
const buttonText: INodeProperties = {
	displayName: 'Text',
	name: 'text',
	type: 'string',
	default: '',
	description: 'Label of the button, 25 characters at most',
};

/**
 * RCS buttons (suggestions), shared by Template › Create and Message › Send / Broadcast.
 *
 * One kind of entry per kind of button, so that each button only shows its own fields. n8n
 * groups the entries by kind: the buttons are sent suggested replies first, then URL, call
 * and location actions, each kind in the order it was entered.
 */
export function rcsButtonsField(show: Show): INodeProperties {
	return {
		displayName: 'RCS Buttons',
		name: 'rcsButtons',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Button',
		default: {},
		description:
			'Buttons shown with the RCS message (RCS is currently available on French mobile operators only): 4 at most on a card, 11 at most on a text. They are shown suggested replies first, then the actions. A suggested reply sends its keyword back to Bi-Way: answer it with an RCS Agent › Create Keyword Reply using the same keyword, or catch it with the Bi-Way SMS/RCS Trigger (Button Keywords option).',
		displayOptions: { show },
		options: [
			{
				displayName: 'Dial Action',
				name: 'dial',
				values: [
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						type: 'string',
						default: '',
						placeholder: 'e.g. +33612345678',
						description: 'Number called when the button is tapped, in international format',
					},
					buttonText,
				],
			},
			{
				displayName: 'Open URL Action',
				name: 'openUrl',
				values: [
					buttonText,
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com',
						description: 'Address opened when the button is tapped',
					},
				],
			},
			{
				displayName: 'Suggested Reply',
				name: 'reply',
				values: [
					{
						displayName: 'Keyword',
						name: 'keyword',
						type: 'string',
						default: '',
						placeholder: 'e.g. YES',
						description:
							'Keyword sent back when the button is tapped. Leave empty to derive it from the text. Bi-Way writes it in upper case, with underscores instead of spaces and special characters.',
					},
					buttonText,
				],
			},
			{
				displayName: 'View Location Action',
				name: 'viewLocation',
				values: [
					{
						displayName: 'Latitude',
						name: 'latitude',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Location Label',
						name: 'locationLabel',
						type: 'string',
						default: '',
						placeholder: 'e.g. Our shop',
						description: 'Name of the place shown on the map',
					},
					{
						displayName: 'Longitude',
						name: 'longitude',
						type: 'number',
						default: 0,
					},
					buttonText,
				],
			},
		],
	};
}
