import type { IDisplayOptions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { galleryFileLocator, galleryImageLocator } from './ResourceLocators';

type Show = NonNullable<IDisplayOptions['show']>;

/** Cards in a carousel (Google RBM limits, also checked by Bi-Way). */
export const CAROUSEL_CARDS_MIN = 2;
export const CAROUSEL_CARDS_MAX = 10;

const CONTENT_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Card',
		value: 'card',
		description: 'A rich card with an image, a title, a body and buttons (RCS or email)',
	},
	{
		name: 'Carousel',
		value: 'carousel',
		description: `From ${CAROUSEL_CARDS_MIN} to ${CAROUSEL_CARDS_MAX} cards side by side (RCS or email)`,
	},
	{
		name: 'Text',
		value: 'text',
		description: 'A text, with buttons on RCS, or attachments by email',
	},
];

/**
 * Content of a message or a template: a text, a card or a carousel. For a message sent from a
 * template, it also filters the templates offered. `textOnly` is the field of the channels that
 * cannot show cards (SMS).
 */
export function contentField(displayOptions: IDisplayOptions, textOnly = false): INodeProperties {
	return {
		displayName: 'Content',
		name: 'content',
		type: 'options',
		options: textOnly
			? CONTENT_OPTIONS.filter((option) => option.value === 'text')
			: CONTENT_OPTIONS,
		default: 'text',
		displayOptions,
	};
}

/**
 * Fields of a rich card, shared by Template › Create and Message › Send / Broadcast, in the order
 * of the card: image, title, body. The buttons come after them.
 */
export function rcsCardFields(show: Show): INodeProperties[] {
	const displayOptions = { show };
	// The channel stays the last condition (see CHANNEL_EXPRESSION in Channels.ts).
	const { channel, ...rest } = show;
	const at = (extra: Show): Show => ({ ...rest, ...extra, ...(channel ? { channel } : {}) });
	return [
		{
			displayName: 'Image',
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
		galleryImageLocator({
			required: true,
			hint: "To use a file uploaded earlier in the workflow, pick 'By ID' and map the 'id' returned by Asset › Upload. The file must be public in the gallery.",
			displayOptions: { show: at({ cardImage: ['gallery'] }) },
		}),
		{
			displayName: 'Image URL',
			name: 'cardImageUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'e.g. https://example.com/image.jpg',
			description: 'Public HTTPS address of the image or video',
			displayOptions: { show: at({ cardImage: ['url'] }) },
		},
		{
			displayName: 'Image MIME Type',
			name: 'cardImageMimeType',
			type: 'string',
			default: 'image/jpeg',
			placeholder: 'e.g. image/png',
			description: 'Type of the file found at the image URL',
			displayOptions: { show: at({ cardImage: ['url'] }) },
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
			displayOptions: { show: at({ cardImage: ['gallery', 'url'] }) },
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
			displayOptions: { show: at({ cardImage: ['gallery', 'url'] }) },
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
			displayOptions: {
				show: at({ cardImage: ['gallery', 'url'], cardOrientation: ['HORIZONTAL'] }),
			},
		},
		{
			displayName: 'Title',
			name: 'cardTitle',
			type: 'string',
			default: '',
			description: 'Title of the card, 200 characters at most',
			displayOptions,
		},
		{
			displayName: 'Body',
			name: 'cardText',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			description: 'Text of the card, 2000 characters at most',
			displayOptions,
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
 * Kinds of button, one entry each so that a button only shows its own fields. n8n groups the
 * entries by kind: the buttons are sent suggested replies first, then URL, call and location
 * actions, each kind in the order it was entered.
 */
const buttonOptions: INodeProperties['options'] = [
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
];

/**
 * Buttons of an RCS text or of a card, shared by Template › Create and Message › Send / Broadcast.
 */
export function rcsButtonsField(show: Show): INodeProperties {
	return {
		displayName: 'Buttons',
		name: 'rcsButtons',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Button',
		default: {},
		description:
			'Buttons of the message: 4 at most on a card, 11 at most on an RCS text, suggested replies first, then the actions. A suggested reply sends its keyword back to Bi-Way: answer it with an RCS Agent › Create Keyword Reply using the same keyword, or catch it with the Bi-Way Trigger (Button Keywords option). By email, the buttons lead to the Bi-Way web chat when needed.',
		displayOptions: { show },
		options: buttonOptions,
	};
}

/**
 * Cards of a carousel, shared by Template › Create and Message › Send / Broadcast. Each card has
 * the fields of a card, in the same order, but no orientation: carousel cards are vertical.
 */
export function rcsCarouselField(show: Show): INodeProperties {
	return {
		displayName: 'Cards',
		name: 'carouselCards',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
			minRequiredFields: CAROUSEL_CARDS_MIN,
			maxAllowedFields: CAROUSEL_CARDS_MAX,
		},
		placeholder: 'Add Card',
		default: {},
		description: `Cards of the carousel, from ${CAROUSEL_CARDS_MIN} to ${CAROUSEL_CARDS_MAX}, shown in this order`,
		displayOptions: { show },
		options: [
			{
				displayName: 'Card',
				name: 'card',
				// Alphabetical: the verification scanner requires it inside a fixed collection.
				values: [
					{
						displayName: 'Body',
						name: 'text',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Text of the card, 2000 characters at most',
					},
					{
						displayName: 'Buttons',
						name: 'buttons',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true, sortable: true },
						placeholder: 'Add Button',
						default: {},
						description:
							'Buttons of the card, 4 at most, suggested replies first, then the actions. By email, they lead to the Bi-Way web chat when needed.',
						options: buttonOptions,
					},
					{
						displayName: 'Image',
						name: 'image',
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
					},
					galleryImageLocator({
						hint: "To use a file uploaded earlier in the workflow, pick 'By ID' and map the 'id' returned by Asset › Upload. The file must be public in the gallery.",
						displayOptions: { show: { image: ['gallery'] } },
					}),
					{
						displayName: 'Image Height',
						name: 'imageHeight',
						type: 'options',
						options: [
							{ name: 'Medium', value: 'MEDIUM' },
							{ name: 'Short', value: 'SHORT' },
							{ name: 'Tall', value: 'TALL' },
						],
						default: 'MEDIUM',
						displayOptions: { show: { image: ['gallery', 'url'] } },
					},
					{
						displayName: 'Image MIME Type',
						name: 'imageMimeType',
						type: 'string',
						default: 'image/jpeg',
						placeholder: 'e.g. image/png',
						description: 'Type of the file found at the image URL',
						displayOptions: { show: { image: ['url'] } },
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/image.jpg',
						description: 'Public HTTPS address of the image or video',
						displayOptions: { show: { image: ['url'] } },
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Title of the card, 200 characters at most',
					},
				],
			},
		],
	};
}

/** Attachments of an email: files of the Bi-Way gallery. */
export function attachmentsField(show: Show): INodeProperties {
	return {
		displayName: 'Attachments',
		name: 'attachments',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Attachment',
		default: {},
		description:
			'Files of your Bi-Way gallery attached to the email. To attach a file of the workflow, upload it first with Asset › Upload and map the ID it returns.',
		displayOptions: { show },
		options: [
			{
				displayName: 'Attachment',
				name: 'attachment',
				values: [galleryFileLocator()],
			},
		],
	};
}
