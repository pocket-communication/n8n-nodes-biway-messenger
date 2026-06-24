import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class BiwayMessengerApi implements ICredentialType {
	name = 'biwayMessengerApi';

	displayName = 'Bi-Way Messenger API';

	documentationUrl = 'https://services.bi-way.fr/openapi/messenger/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Long-lived Bearer token issued by Bi-Way',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://services.bi-way.fr',
			description: 'Override only when using a self-hosted Bi-Way instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};
}
