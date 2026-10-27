import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { biwayApiRequest, getBaseUrl, normalizeKeyword } from './GenericFunctions';

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

function byteLength(value: string): number {
	return new TextEncoder().encode(value).length;
}

function fail(context: IExecuteFunctions, i: number, message: string, description: string): never {
	throw new NodeOperationError(context.getNode(), message, { itemIndex: i, description });
}

export function isRcsChannel(channel: string): boolean {
	return /rcs/i.test(channel);
}

/**
 * Buttons of the RCS Buttons field, in the format Bi-Way validates (CRCSMessage::validSuggestion).
 */
export function buildRcsButtons(this: IExecuteFunctions, i: number, max: number): IDataObject[] {
	const input = this.getNodeParameter('rcsButtons', i, {}) as Partial<
		Record<ButtonKind, ButtonInput[]>
	>;
	const buttons = BUTTON_KINDS.flatMap((kind) =>
		(input[kind] ?? []).map((button) => ({ ...button, kind })),
	);
	if (buttons.length > max) {
		fail(
			this,
			i,
			`Too many RCS buttons (${buttons.length})`,
			`RCS allows ${max} buttons at most here. Remove some buttons.`,
		);
	}

	return buttons.map((button, index) => {
		const position = index + 1;
		const text = String(button.text ?? '').trim();
		if (text === '') {
			fail(this, i, `RCS button ${position} has no text`, 'Fill in the "Text" of the button.');
		}
		if (byteLength(text) > BUTTON_TEXT_MAX) {
			fail(
				this,
				i,
				`The text of RCS button ${position} is too long`,
				`"${text}" is longer than ${BUTTON_TEXT_MAX} characters (accented letters count twice).`,
			);
		}

		switch (button.kind) {
			case 'openUrl': {
				const url = String(button.url ?? '').trim();
				if (!/^https?:\/\//i.test(url)) {
					fail(
						this,
						i,
						`RCS button ${position} needs a URL`,
						'Use a full address starting with https://.',
					);
				}
				return {
					text,
					postbackData: `n8n_open_url_${position}`,
					'extra-type': 'action',
					'action-type': 'open-url',
					url,
				};
			}
			case 'dial': {
				const phoneNumber = String(button.phoneNumber ?? '').replace(/\s+/g, '');
				if (phoneNumber === '') {
					fail(
						this,
						i,
						`RCS button ${position} needs a phone number`,
						'Use the international format, e.g. +33612345678.',
					);
				}
				return {
					text,
					postbackData: `n8n_dial_${position}`,
					'extra-type': 'action',
					'action-type': 'dial',
					phoneNumber,
				};
			}
			case 'viewLocation':
				return {
					text,
					postbackData: `n8n_location_${position}`,
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
export function buildRcsFallback(this: IExecuteFunctions, i: number): IDataObject | false | undefined {
	const fallback = this.getNodeParameter('rcsFallback', i, 'account') as string;
	if (fallback === 'none') {
		return false;
	}
	if (fallback !== 'custom') {
		return undefined;
	}

	const text = String(this.getNodeParameter('rcsFallbackText', i, '')).trim();
	if (text === '') {
		fail(this, i, 'The fallback SMS has no text', 'Fill in "Fallback SMS Text", or pick another option.');
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
): Promise<IDataObject> {
	if (!(assetId > 0)) {
		fail(
			this,
			i,
			'No image is selected for the card',
			'Pick an image of your gallery, or map the "id" of Asset › Upload.',
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
			`Its type is "${type || 'unknown'}". Pick an image or a video.`,
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
 * RCS card of the card fields, in the format Bi-Way validates (CRCSMessage::validCard).
 */
export async function buildRcsCard(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const title = String(this.getNodeParameter('cardTitle', i, '')).trim();
	const text = String(this.getNodeParameter('cardText', i, '')).trim();
	const image = this.getNodeParameter('cardImage', i, 'none') as string;
	const orientation = this.getNodeParameter('cardOrientation', i, 'VERTICAL') as string;

	if (byteLength(title) > CARD_TITLE_MAX) {
		fail(
			this,
			i,
			'The card title is too long',
			`${CARD_TITLE_MAX} characters at most (accented letters count twice).`,
		);
	}
	if (byteLength(text) > CARD_TEXT_MAX) {
		fail(
			this,
			i,
			'The card text is too long',
			`${CARD_TEXT_MAX} characters at most (accented letters count twice).`,
		);
	}
	if (title === '' && text === '' && image === 'none') {
		fail(this, i, 'The RCS card is empty', 'Give the card a title, a text or an image.');
	}

	const card: IDataObject = { cardOrientation: orientation };
	if (orientation === 'HORIZONTAL') {
		card.thumbnailImageAlignment = this.getNodeParameter('cardImageAlignment', i, 'LEFT');
	}
	if (title) {
		card.title = title;
	}
	if (text) {
		card.text = text;
	}

	const height = this.getNodeParameter('cardImageHeight', i, 'MEDIUM') as string;
	if (image === 'gallery') {
		card.media = await galleryMedia.call(
			this,
			i,
			Number(this.getNodeParameter('cardImageId', i)),
			height,
		);
	} else if (image === 'url') {
		const source = String(this.getNodeParameter('cardImageUrl', i, '')).trim();
		if (!/^https:\/\//i.test(source)) {
			fail(this, i, 'The image URL must use HTTPS', 'Use a public address starting with https://.');
		}
		card.media = {
			height,
			source,
			type: String(this.getNodeParameter('cardImageMimeType', i, 'image/jpeg')).trim(),
			size: 0,
		};
	}

	const buttons = buildRcsButtons.call(this, i, CARD_BUTTONS_MAX);
	if (buttons.length) {
		card.suggestions = buttons;
	}
	return card;
}
