import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	getContactGroups,
	getGalleryFiles,
	getGalleryImages,
	getScenarios,
	getTemplates,
} from './loadOptions';

/** Bi-Way lists are short: the node loads them once and filters on the name or the ID. */
function matching(options: INodePropertyOptions[], filter?: string): INodeListSearchResult {
	const needle = (filter ?? '').trim().toLowerCase();
	return {
		results: needle
			? options.filter(
					(option) => option.name.toLowerCase().includes(needle) || String(option.value) === needle,
				)
			: options,
	};
}

export async function searchTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return matching(await getTemplates.call(this), filter);
}

export async function searchContactGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return matching(await getContactGroups.call(this), filter);
}

export async function searchScenarios(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return matching(await getScenarios.call(this), filter);
}

export async function searchGalleryImages(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return matching(await getGalleryImages.call(this), filter);
}

export async function searchGalleryFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return matching(await getGalleryFiles.call(this), filter);
}
