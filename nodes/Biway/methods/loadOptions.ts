import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { biwayApiCall, biwayApiRequest } from '../GenericFunctions';

/** Used when Bi-Way cannot list the channels of the account. */
const DEFAULT_CHANNELS: INodePropertyOptions[] = [
	{ name: 'Email', value: 'email' },
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

export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const body = await biwayApiRequest.call(this, 'COLLECTION', '/messenger/template', undefined, {
		limit: 200,
		sort_by: 'title',
		sort_dir: 'asc',
	});
	return asList(body, 'templates').map((template) => ({
		name: `${String(template.title || `Template ${template.id}`)} (${String(template.format ?? '')})`,
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
