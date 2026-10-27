import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BiwayApi implements ICredentialType {
	name = 'biwayApi';

	displayName = 'Bi-Way API';

	icon: Icon = { light: 'file:../icons/biway.png', dark: 'file:../icons/biway.png' };

	documentationUrl =
		'https://github.com/pocket-communication/n8n-nodes-biway-messenger#credentials';

	properties: INodeProperties[] = [
		{
			displayName:
				'Create an API key in Bi-Way: <a href="https://v3.bi-way.fr/settings/security" target="_blank">Settings › Security › API keys</a>. Copy the token and the secret: the secret is shown only once.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://services.bi-way.fr',
			description: 'Address of the Bi-Way API. Change it only if Bi-Way support asks you to.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.token}}',
				password: '={{$credentials.secret}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/session/user/me',
			method: 'GET',
		},
	};
}
