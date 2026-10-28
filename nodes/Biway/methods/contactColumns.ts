import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { biwayApiCall } from '../GenericFunctions';

export interface ContactColumn {
	name: string;
	label: string;
	type: string;
	mandatory: boolean;
}

/** Default columns of a Bi-Way contact, used when the account cannot list its columns. */
const DEFAULT_COLUMNS: ContactColumn[] = [
	{ name: 'birthday', label: 'Birthday', type: 'date', mandatory: false },
	{ name: 'civility', label: 'Civility', type: 'string', mandatory: false },
	{ name: 'custom_id', label: 'Custom ID', type: 'string', mandatory: false },
	{ name: 'email', label: 'Email', type: 'email', mandatory: false },
	{ name: 'name', label: 'Name', type: 'string', mandatory: false },
	{ name: 'phone', label: 'Phone', type: 'phone', mandatory: false },
	{ name: 'surname', label: 'First Name', type: 'string', mandatory: false },
];

/**
 * Writable columns of the contacts of the account: default columns and the account's own columns.
 * Only these names are ever sent to Bi-Way as field names.
 */
export async function getContactColumnList(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<ContactColumn[]> {
	const response = await biwayApiCall.call(this, 'COLLECTION', '/file/column', undefined, {
		'entry-type': 'contact',
	});
	const byType = (response.body ?? {}) as IDataObject;
	const contact = byType.contact;
	if (response.errorCode || typeof contact !== 'object' || contact === null) {
		this.logger.warn('Bi-Way: the contact columns of the account could not be listed', {
			code: response.errorCode,
		});
		return DEFAULT_COLUMNS;
	}

	const columns: ContactColumn[] = [];
	for (const column of Object.values(contact as IDataObject) as IDataObject[]) {
		const name = String(column.name ?? '');
		// Computed columns and columns of linked records cannot be written here.
		if (!/^[A-Za-z0-9_-]+$/.test(name) || column.virtual === true || column.child === true) {
			continue;
		}
		columns.push({
			name,
			// Bi-Way suffixes the label with the record type: "Phone (Contact)".
			label: String(column.label ?? name).replace(/\s*\([^()]*\)\s*$/, '') || name,
			type: String(column.type ?? 'string'),
			mandatory: column.mandatory === true,
		});
	}
	return columns.length ? columns : DEFAULT_COLUMNS;
}

function fieldType(type: string): FieldType {
	if (type === 'number' || type === 'integer' || type === 'float') {
		return 'number';
	}
	if (type === 'boolean') {
		return 'boolean';
	}
	return 'string';
}

function displayName(column: ContactColumn): string {
	if (column.type === 'phone') {
		return `${column.label} (international format, e.g. +33612345678)`;
	}
	if (column.type === 'email') {
		return `${column.label} (email address)`;
	}
	return column.label;
}

export async function getContactColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const columns = await getContactColumnList.call(this);
	const fields: ResourceMapperField[] = columns.map((column) => ({
		id: column.name,
		displayName: displayName(column),
		required: column.mandatory,
		defaultMatch: column.name === 'phone',
		canBeUsedToMatch: false,
		display: true,
		type: fieldType(column.type),
	}));
	return { fields };
}
