import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { biwayApiCall, biwayApiRequest, templateContent } from '../GenericFunctions';

/** Used when Bi-Way cannot list the channels of the account. */
const DEFAULT_CHANNELS: INodePropertyOptions[] = [
	{ name: 'RCS', value: 'rcs' },
	{ name: 'SMS (Long Number)', value: 'sms_long_number' },
	{ name: 'SMS (Short Number)', value: 'sms_short_id' },
];

function asList(body: unknown, key: string): IDataObject[] {
	if (Array.isArray(body)) {
		return body as IDataObject[];
	}
	if (typeof body === 'object' && body !== null && Array.isArray((body as IDataObject)[key])) {
		return (body as IDataObject)[key] as IDataObject[];
	}
	return [];
}

function byName(a: INodePropertyOptions, b: INodePropertyOptions): number {
	return a.name.localeCompare(b.name);
}

export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await biwayApiCall.call(this, 'COLLECTION', '/messenger/channel');
	if (response.errorCode) {
		this.logger.warn('Bi-Way: the channels of the account could not be listed', {
			code: response.errorCode,
		});
		return DEFAULT_CHANNELS;
	}
	const options: INodePropertyOptions[] = [];
	for (const group of asList(response.body, 'channels')) {
		for (const channel of asList(group.channels, 'channels')) {
			const value = String(channel.name ?? '');
			if (value && !options.some((option) => option.value === value)) {
				options.push({ name: String(channel.label || value), value });
			}
		}
	}
	return options.length ? options.sort(byName) : DEFAULT_CHANNELS;
}

export async function getSenders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const channel = String(this.getCurrentNodeParameter('channel') ?? '');
	const options: INodePropertyOptions[] = [{ name: 'Account Default', value: '' }];
	if (!channel) {
		return options;
	}
	const body = await biwayApiRequest.call(this, 'COLLECTION', '/messenger/sender', undefined, {
		channel,
	});
	for (const sender of asList(body, 'senders')) {
		const value = String(sender.value ?? '');
		if (value) {
			options.push({
				name: `${String(sender.label || value)}${sender.default ? ' (default)' : ''}`,
				value,
			});
		}
	}
	return options;
}

/** Parameter chosen in the node, when it is a plain value and not an expression. */
function chosenValue(this: ILoadOptionsFunctions, name: string): string {
	let value: unknown;
	try {
		value = this.getCurrentNodeParameter(name);
	} catch (error) {
		// Fields that list templates without a channel or a content (scenarios, keyword replies).
		this.logger.debug(`Bi-Way: no '${name}' to filter the templates`, { error });
		return '';
	}
	return typeof value === 'string' && value !== '' && !value.startsWith('=') ? value : '';
}

export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const query: IDataObject = { limit: 200, sort_by: 'title', sort_dir: 'asc' };
	// With a channel, Bi-Way only lists the templates that channel can carry.
	const channel = chosenValue.call(this, 'channel');
	const content = chosenValue.call(this, 'content');
	let response = await biwayApiCall.call(this, 'COLLECTION', '/messenger/template', undefined, {
		...query,
		...(channel ? { channel } : {}),
	});
	if (response.errorCode && channel) {
		this.logger.warn('Bi-Way: the templates could not be filtered by channel', {
			channel,
			code: response.errorCode,
		});
		response = await biwayApiCall.call(this, 'COLLECTION', '/messenger/template', undefined, query);
	}
	const body = response.errorCode
		? await biwayApiRequest.call(this, 'COLLECTION', '/messenger/template', undefined, query)
		: response.body;
	return asList(body, 'templates')
		.filter((template) => !content || templateContent(template) === content)
		.map((template) => ({
			name: `${String(template.title || `Template ${template.id}`)} (${templateContent(template)})`,
			value: Number(template.id),
		}));
}

export async function getContactGroups(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const body = await biwayApiRequest.call(this, 'COLLECTION', '/file/group', undefined, {
		entry_type: 'contact',
	});
	return asList(body, 'groups')
		.map((group) => ({
			name: `${String(group.title || `Group ${group.id}`)} (${Number(group.length ?? 0)})`,
			value: Number(group.id),
		}))
		.sort(byName);
}

export async function getGalleryImages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const body = await biwayApiRequest.call(this, 'COLLECTION', '/gallery/asset', undefined, {
		filter_by_type: 'image,video',
		limit: 200,
		// The listing embeds a thumbnail: keep it tiny.
		thumbnail_width: 1,
		thumbnail_height: 1,
	});
	return asList(body, 'assets')
		.map((asset) => {
			const id = Number(asset.id ?? 0);
			const label = String(asset.description || asset.name || `File ${id}`);
			return { name: `${label} (${id})`, value: id };
		})
		.filter((option) => option.value > 0)
		.sort(byName);
}

export async function getScenarios(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const body = await biwayApiRequest.call(this, 'COLLECTION', '/chatbot/script', undefined, {
		limit: 200,
		sort_by: 'title',
		sort_dir: 'asc',
	});
	return asList(body, 'scripts').map((script) => ({
		name: `${String(script.title || `Scenario ${script.id}`)}${Number(script.state) === 1 ? '' : ' (inactive)'}`,
		value: Number(script.id),
	}));
}
