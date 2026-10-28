import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CAROUSEL_CARDS_MAX, CAROUSEL_CARDS_MIN } from './descriptions/RcsContentDescription';
import { biwayApiRequest, getBaseUrl, locatorValue, normalizeKeyword } from './GenericFunctions';

/** RCS limits checked by Bi-Way (byte lengths, as PHP strlen counts them). */
const BUTTON_TEXT_MAX = 25;
const CARD_TITLE_MAX = 200;
const CARD_TEXT_MAX = 2000;
export const CARD_BUTTONS_MAX = 4;
export const MESSAGE_BUTTONS_MAX = 11;

interface ButtonInput {
	text?: string;
	keyword?: string;
	url?: string;
	phoneNumber?: string;
	latitude?: number;
	longitude?: number;
	locationLabel?: string;
}

/** Kinds of button of the RCS Buttons field, in the order the buttons are sent. */
const BUTTON_KINDS = ['reply', 'openUrl', 'dial', 'viewLocation'] as const;

type ButtonKind = (typeof BUTTON_KINDS)[number];

type ButtonsInput = Partial<Record<ButtonKind, ButtonInput[]>>;

/** Fields of a card, whether it stands alone or belongs to a carousel. */
interface CardInput {
	title?: string;
	text?: string;
	image?: string;
	/** Gallery file: a number at the top level, a raw resource locator inside a carousel. */
	cardImageId?: unknown;
	imageUrl?: string;
	imageMimeType?: string;
	imageHeight?: string;
	buttons?: ButtonsInput;
}

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function fail(context: IExecuteFunctions, i: number, message: string, description: string): never {
	throw new NodeOperationError(context.getNode(), message, { itemIndex: i, description });
}

export function isRcsChannel(channel: string): boolean {
	return /rcs/i.test(channel);
}

/** Email channels of Bi-Way: email (Mailjet) and email_smtp. */
export function isEmailChannel(channel: string): boolean {
	return /email/i.test(channel);
}

/**
 * Buttons in the format Bi-Way validates (CRCSMessage::validSuggestion). `card` is the position of
 * the card in a carousel, to name the button in messages.
 */
function rcsButtons(
	context: IExecuteFunctions,
	i: number,
	input: ButtonsInput,
	max: number,
	card?: number,
): IDataObject[] {
	const buttons = BUTTON_KINDS.flatMap((kind) =>
		(input[kind] ?? []).map((button) => ({ ...button, kind })),
	);
	const where = card === undefined ? '' : ` of card ${card}`;
	if (buttons.length > max) {
		fail(
			context,
			i,
			`Too many RCS buttons${where} (${buttons.length})`,
			`RCS allows ${max} buttons at most here. Remove some buttons.`,
		);
	}

	return buttons.map((button, index) => {
		const position = index + 1;
		const label = `RCS button ${position}${where}`;
		const tag = card === undefined ? `${position}` : `${card}_${position}`;
		const text = String(button.text ?? '').trim();
		if (text === '') {
			fail(context, i, `${label} has no text`, "Fill in the 'Text' of the button.");
		}
		if (byteLength(text) > BUTTON_TEXT_MAX) {
			fail(
				context,
				i,
				`The text of ${label} is too long`,
				`'${text}' is longer than ${BUTTON_TEXT_MAX} characters (accented letters count twice).`,
			);
		}

		switch (button.kind) {
			case 'openUrl': {
				const url = String(button.url ?? '').trim();
				if (!/^https?:\/\//i.test(url)) {
					fail(context, i, `${label} needs a URL`, 'Use a full address starting with https://.');
				}
				return {
					text,
					postbackData: `n8n_open_url_${tag}`,
					'extra-type': 'action',
					'action-type': 'open-url',
					url,
				};
			}
			case 'dial': {
				const phoneNumber = String(button.phoneNumber ?? '').replace(/\s+/g, '');
				if (phoneNumber === '') {
					fail(
						context,
						i,
						`${label} needs a phone number`,
						'Use the international format, e.g. +33612345678.',
					);
				}
				return {
					text,
					postbackData: `n8n_dial_${tag}`,
					'extra-type': 'action',
					'action-type': 'dial',
					phoneNumber,
				};
			}
			case 'viewLocation':
				return {
					text,
					postbackData: `n8n_location_${tag}`,
					'extra-type': 'action',
					'action-type': 'view-location',
					latitude: String(button.latitude ?? 0),
					longitude: String(button.longitude ?? 0),
					label: String(button.locationLabel ?? '').trim() || text,
				};
			default: {
				// The keyword must equal the keyword reply exactly, as Bi-Way saves it.
				const keyword = normalizeKeyword(button.keyword || text);
				return { text, postbackData: keyword, 'extra-type': 'reply' };
			}
		}
	});
}

/** Buttons of the RCS Buttons field of a text or a card. */
export function buildRcsButtons(this: IExecuteFunctions, i: number, max: number): IDataObject[] {
	return rcsButtons(this, i, this.getNodeParameter('rcsButtons', i, {}) as ButtonsInput, max);
}

/** Longest fallback SMS Bi-Way sends: a longer one, once personalized, is not sent at all. */
const FALLBACK_TEXT_MAX = 160;
const FALLBACK_SENDER_MAX = 11;

/** Alias Bi-Way replaces with the default SMS sender of the account. */
const DEFAULT_FALLBACK_SENDER = '36XXX';

/**
 * Fallback SMS of an RCS message (`extra.rcs.alternate`), as Bi-Way validates it
 * (CRCSMessage::validAlternate): `undefined` keeps the fallback SMS of the account, `false` asks
 * for no SMS at all (the status update then reports "unsupported").
 */
export function buildRcsFallback(
	this: IExecuteFunctions,
	i: number,
): IDataObject | false | undefined {
	const fallback = this.getNodeParameter('rcsFallback', i, 'account') as string;
	if (fallback === 'none') {
		return false;
	}
	if (fallback !== 'custom') {
		return undefined;
	}

	const text = String(this.getNodeParameter('rcsFallbackText', i, '')).trim();
	if (text === '') {
		fail(
			this,
			i,
			'The fallback SMS has no text',
			"Fill in 'Fallback SMS Text', or pick another option.",
		);
	}
	if ([...text].length > FALLBACK_TEXT_MAX) {
		fail(
			this,
			i,
			'The fallback SMS is too long',
			`Bi-Way sends no fallback SMS longer than ${FALLBACK_TEXT_MAX} characters, STOP mention and chat link included.`,
		);
	}

	const options = this.getNodeParameter('rcsFallbackOptions', i, {}) as IDataObject;
	const sender = String(options.sender ?? '').trim() || DEFAULT_FALLBACK_SENDER;
	if (sender.length > FALLBACK_SENDER_MAX) {
		fail(
			this,
			i,
			'The sender of the fallback SMS is too long',
			`An SMS sender has ${FALLBACK_SENDER_MAX} characters at most.`,
		);
	}
	const hours = Number(options.expireHours ?? 6);

	return {
		format: 'text',
		text,
		sender,
		stop: options.stop === false ? '0' : '1',
		chat_url: options.chatUrl === true ? '1' : '0',
		expire_time: String(Number.isFinite(hours) && hours >= 1 ? Math.round(hours) : 6),
	};
}

/** Media of a file of the Bi-Way gallery, as the RCS formatter of Bi-Way expects it. */
async function galleryMedia(
	this: IExecuteFunctions,
	i: number,
	assetId: number,
	height: string,
	label: string,
): Promise<IDataObject> {
	if (!(assetId > 0)) {
		fail(
			this,
			i,
			`No image is selected for ${label}`,
			"Pick an image of your gallery, or map the 'id' of Asset › Upload.",
		);
	}
	const asset = (await biwayApiRequest.call(
		this,
		'GET',
		`/gallery/asset/${assetId}`,
		undefined,
		{ asset_data: 1 },
		i,
	)) as IDataObject;
	const type = String(asset.content_type ?? '');
	if (!/^(image|video)\//.test(type)) {
		fail(
			this,
			i,
			`The gallery file ${assetId} is not an image or a video`,
			`Its type is '${type || 'unknown'}'. Pick an image or a video.`,
		);
	}
	return {
		height,
		// The RCS formatter recognizes gallery files by this address.
		source: `${await getBaseUrl.call(this)}/gallery/finder/${assetId}`,
		type,
		size: Number(asset.length ?? 0),
	};
}

/**
 * Card in the format Bi-Way validates (CRCSMessage::validCard), without orientation. `label` names
 * the card in messages: "the card", "card 2".
 */
async function rcsCard(
	this: IExecuteFunctions,
	i: number,
	input: CardInput,
	label: string,
	card?: number,
): Promise<IDataObject> {
	const title = String(input.title ?? '').trim();
	const text = String(input.text ?? '').trim();
	const image = input.image ?? 'none';

	if (byteLength(title) > CARD_TITLE_MAX) {
		fail(
			this,
			i,
			`The title of ${label} is too long`,
			`${CARD_TITLE_MAX} characters at most (accented letters count twice).`,
		);
	}
	if (byteLength(text) > CARD_TEXT_MAX) {
		fail(
			this,
			i,
			`The body of ${label} is too long`,
			`${CARD_TEXT_MAX} characters at most (accented letters count twice).`,
		);
	}
	if (title === '' && text === '' && image === 'none') {
		fail(this, i, `${capitalize(label)} is empty`, 'Give the card a title, a body or an image.');
	}

	const result: IDataObject = {};
	if (title) {
		result.title = title;
	}
	if (text) {
		result.text = text;
	}

	const height = input.imageHeight || 'MEDIUM';
	if (image === 'gallery') {
		result.media = await galleryMedia.call(
			this,
			i,
			Number(locatorValue(input.cardImageId)),
			height,
			label,
		);
	} else if (image === 'url') {
		const source = String(input.imageUrl ?? '').trim();
		if (!/^https:\/\//i.test(source)) {
			fail(
				this,
				i,
				`The image URL of ${label} must use HTTPS`,
				'Use a public address starting with https://.',
			);
		}
		result.media = {
			height,
			source,
			type: String(input.imageMimeType || 'image/jpeg').trim(),
			size: 0,
		};
	}

	const buttons = rcsButtons(this, i, input.buttons ?? {}, CARD_BUTTONS_MAX, card);
	if (buttons.length) {
		result.suggestions = buttons;
	}
	return result;
}

/**
 * Card of the card fields, in the format Bi-Way validates (CRCSMessage::validCard) for RCS and email.
 */
export async function buildRcsCard(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const orientation = this.getNodeParameter('cardOrientation', i, 'VERTICAL') as string;
	const card = await rcsCard.call(
		this,
		i,
		{
			title: this.getNodeParameter('cardTitle', i, '') as string,
			text: this.getNodeParameter('cardText', i, '') as string,
			image: this.getNodeParameter('cardImage', i, 'none') as string,
			cardImageId: this.getNodeParameter('cardImageId', i, '', { extractValue: true }),
			imageUrl: this.getNodeParameter('cardImageUrl', i, '') as string,
			imageMimeType: this.getNodeParameter('cardImageMimeType', i, 'image/jpeg') as string,
			imageHeight: this.getNodeParameter('cardImageHeight', i, 'MEDIUM') as string,
			buttons: this.getNodeParameter('rcsButtons', i, {}) as ButtonsInput,
		},
		'the card',
	);
	const result: IDataObject = { cardOrientation: orientation, ...card };
	if (orientation === 'HORIZONTAL') {
		result.thumbnailImageAlignment = this.getNodeParameter('cardImageAlignment', i, 'LEFT');
	}
	return result;
}

/**
 * Cards of the Cards field of a carousel. Bi-Way sends a list of several cards as a carousel, by RCS
 * and by email.
 */
export async function buildRcsCarousel(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const input = this.getNodeParameter('carouselCards', i, {}) as { card?: CardInput[] };
	const cards = input.card ?? [];
	if (cards.length < CAROUSEL_CARDS_MIN || cards.length > CAROUSEL_CARDS_MAX) {
		fail(
			this,
			i,
			`A carousel has ${CAROUSEL_CARDS_MIN} to ${CAROUSEL_CARDS_MAX} cards, not ${cards.length}`,
			cards.length < CAROUSEL_CARDS_MIN
				? "Add cards in 'Cards', or pick 'Card' in 'Content' for a single card."
				: "Remove cards from 'Cards'.",
		);
	}
	const result: IDataObject[] = [];
	for (const [index, card] of cards.entries()) {
		result.push(await rcsCard.call(this, i, card, `card ${index + 1}`, index + 1));
	}
	return result;
}
