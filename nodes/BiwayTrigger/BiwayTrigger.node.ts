import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	biwayApiCall,
	biwayApiRequest,
	sameToken,
	toBiwayError,
	webhookToken,
} from '../Biway/GenericFunctions';

interface CallbackRegistration {
	event: string;
	id: number;
}

interface Registration {
	/** URL registered on Bi-Way, token included. */
	url: string;
	callbacks: CallbackRegistration[];
}

interface TriggerStaticData {
	/** Keyed by webhook URL, so test and production registrations never collide. */
	registrations?: Record<string, Registration>;
}

/** Codes meaning the registration is already gone on Bi-Way. */
const GONE_CODES = ['callback_not_found', 'not_callback_owner'];

async function expectedUrl(this: IHookFunctions, webhookUrl: string): Promise<string> {
	const credentials = await this.getCredentials('biwayApi');
	const token = webhookToken(String(credentials.secret ?? ''), this.getNode().webhookId ?? '');
	return `${webhookUrl}?t=${token}`;
}

function staticDataOf(context: IHookFunctions): TriggerStaticData {
	return context.getWorkflowStaticData('node') as TriggerStaticData;
}

/** Removes a callback from Bi-Way. Returns false when Bi-Way could not remove it. */
async function removeCallback(
	this: IHookFunctions,
	callback: CallbackRegistration,
): Promise<boolean> {
	try {
		const response = await biwayApiCall.call(this, 'DELETE', `/system/callback/${callback.id}`);
		if (!response.errorCode || GONE_CODES.includes(response.errorCode)) {
			return true;
		}
		this.logger.error('Bi-Way Trigger: the webhook could not be removed from Bi-Way', {
			callbackId: callback.id,
			event: callback.event,
			code: response.errorCode,
		});
		return false;
	} catch (error) {
		this.logger.error('Bi-Way Trigger: the webhook could not be removed from Bi-Way', {
			callbackId: callback.id,
			event: callback.event,
			error: (error as Error).message,
		});
		return false;
	}
}

export class BiwayTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bi-Way Trigger',
		name: 'biwayTrigger',
		icon: { light: 'file:../../icons/biway.png', dark: 'file:../../icons/biway.png' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Bi-Way sends an event',
		defaults: { name: 'Bi-Way Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'biwayApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Bi-Way sends the events of your whole account, including messages not sent from n8n. The webhook URL must be reachable from the internet over HTTPS. If you change the secret of the credential, deactivate and reactivate the workflow.',
				name: 'triggerNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['MESSENGER_REPORT', 'MESSENGER_DELIVERY'],
				options: [
					{
						name: 'Account State Changed',
						value: 'ACCOUNT_STATE',
						description: 'Your Bi-Way account was enabled or disabled',
					},
					{
						name: 'Contact Import State Changed',
						value: 'IMPORT_TASK_STATE',
						description: 'A contact import started by Contact › Import File progressed or ended',
					},
					{
						name: 'Message Received',
						value: 'MESSENGER_DELIVERY',
						description: 'A customer sent a message or replied to one of your messages',
					},
					{
						name: 'Message Status Updated',
						value: 'MESSENGER_REPORT',
						description: 'A message you sent was delivered, read, refused or clicked',
					},
					{
						name: 'RCS Agent State Changed',
						value: 'CHATBOT_STATE',
						description: 'Your RCS agent changed state at a mobile operator',
					},
					{
						name: 'RCS Capability Check Completed',
						value: 'CHATBOT_CAPABILITIES_CHECK',
						description: 'Bi-Way finished checking which phone numbers can receive RCS',
					},
				],
				description: 'Bi-Way events that start the workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const registration = staticDataOf(this).registrations?.[webhookUrl];
				if (!registration) {
					return false;
				}

				const events = this.getNodeParameter('events') as string[];
				const sameEvents =
					registration.callbacks.length === events.length &&
					events.every((event) => registration.callbacks.some((cb) => cb.event === event));
				if (!sameEvents || registration.url !== (await expectedUrl.call(this, webhookUrl))) {
					return false;
				}

				for (const callback of registration.callbacks) {
					const response = await biwayApiCall.call(this, 'GET', `/system/callback/${callback.id}`);
					if (GONE_CODES.includes(response.errorCode)) {
						return false;
					}
					if (response.errorCode) {
						throw toBiwayError.call(this, response);
					}
					const stored = (response.body ?? {}) as IDataObject;
					if (
						stored.url !== registration.url ||
						Number(stored.state) !== 1 ||
						stored.event !== callback.event
					) {
						return false;
					}
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const url = await expectedUrl.call(this, webhookUrl);

				// `multiple` adds this URL next to the ones the account already has, instead of
				// replacing them. `events` alone: a Bi-Way server without multi-registration refuses
				// the call rather than overwriting the account's callback URLs.
				const response = await biwayApiRequest.call(this, 'POST', '/system/callback', {
					url,
					events,
					multiple: true,
					grouped: false,
				});
				if (!Array.isArray(response)) {
					throw new NodeOperationError(
						this.getNode(),
						'Bi-Way gave an unexpected answer when registering the webhook',
						{ description: `Answer: ${JSON.stringify(response)}` },
					);
				}
				const callbacks: CallbackRegistration[] = (response as IDataObject[]).map((callback) => ({
					event: String(callback.event),
					id: Number(callback.id),
				}));

				// Remove what an earlier registration of this URL left behind (unselected events, old
				// token).
				const staticData = staticDataOf(this);
				const previous = staticData.registrations?.[webhookUrl];
				for (const callback of previous?.callbacks ?? []) {
					if (!callbacks.some((current) => current.id === callback.id)) {
						await removeCallback.call(this, callback);
					}
				}

				staticData.registrations = {
					...(staticData.registrations ?? {}),
					[webhookUrl]: { url, callbacks },
				};
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const staticData = staticDataOf(this);
				const registration = staticData.registrations?.[webhookUrl];
				if (!registration) {
					return true;
				}

				const remaining: CallbackRegistration[] = [];
				for (const callback of registration.callbacks) {
					if (!(await removeCallback.call(this, callback))) {
						remaining.push(callback);
					}
				}

				if (remaining.length) {
					registration.callbacks = remaining;
					return false;
				}
				delete staticData.registrations?.[webhookUrl];
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('biwayApi');
		const expected = webhookToken(String(credentials.secret ?? ''), this.getNode().webhookId ?? '');
		const query = this.getQueryData() as IDataObject;
		const received = typeof query.t === 'string' ? query.t : '';
		if (!sameToken(received, expected)) {
			this.getResponseObject().status(403).json({ message: 'Invalid token' });
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData();
		const selected = this.getNodeParameter('events') as string[];
		const events = (Array.isArray(body.events) ? (body.events as unknown[]) : []).filter(
			(event): event is IDataObject =>
				typeof event === 'object' &&
				event !== null &&
				selected.includes(String((event as IDataObject).event)),
		);

		if (!events.length) {
			return { webhookResponse: { received: 0 } };
		}
		return { workflowData: [this.helpers.returnJsonArray(events)] };
	}
}
