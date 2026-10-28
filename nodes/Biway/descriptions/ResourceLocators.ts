import type { INodeProperties } from 'n8n-workflow';

/**
 * Resource locators of the node: pick from a searchable list, or type the ID (n8n UX guidelines).
 * Inside a collection or a fixed collection, n8n hands the raw locator to the node: read it with
 * locatorValue().
 */
function locator(
	name: string,
	displayName: string,
	searchListMethod: string,
	what: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 1234',
				validation: [
					{
						type: 'regex',
						properties: { regex: '^[0-9]+$', errorMessage: `Not a valid ${what} ID` },
					},
				],
			},
		],
		...extra,
	};
}

export const templateLocator = (
	displayName: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties => locator('templateId', displayName, 'searchTemplates', 'template', extra);

export const contactGroupLocator = (extra: Partial<INodeProperties> = {}): INodeProperties =>
	locator('groupId', 'Contact Group', 'searchContactGroups', 'contact group', extra);

export const scenarioLocator = (extra: Partial<INodeProperties> = {}): INodeProperties =>
	locator('scenarioId', 'Scenario', 'searchScenarios', 'scenario', extra);

export const galleryImageLocator = (extra: Partial<INodeProperties> = {}): INodeProperties =>
	locator('cardImageId', 'Gallery Image', 'searchGalleryImages', 'gallery file', extra);

export const galleryFileLocator = (extra: Partial<INodeProperties> = {}): INodeProperties =>
	locator('assetId', 'File', 'searchGalleryFiles', 'gallery file', extra);
