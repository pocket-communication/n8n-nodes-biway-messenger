import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

const EVENT_TYPES = [
	{ name: 'Account State Change', value: 'ACCOUNT_STATE' },
	{ name: 'Chatbot Capabilities Check', value: 'CHATBOT_CAPABILITIES_CHECK' },
	{ name: 'Chatbot State Change', value: 'CHATBOT_STATE' },
	{ name: 'Customer State Change', value: 'CUSTOMER_STATE' },
	{ name: 'File Import Task Completed', value: 'IMPORT_TASK_STATE' },
	{ name: 'Message Delivery Notification', value: 'MESSENGER_DELIVERY' },
	{ name: 'Message Report (read/delivery receipt)', value: 'MESSENGER_REPORT' },
];

export class BiwayMessengerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bi-Way Messenger Trigger',
		name: 'biwayMessengerTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Receives events from the Bi-Way Messaging API via webhook',
		defaults: { name: 'Bi-Way Messenger Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'biwayMessengerApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'biway-events',
			},
		],
		properties: [
			{
				displayName: 'Event Types',
				name: 'eventTypes',
				type: 'multiOptions',
				options: EVENT_TYPES,
				default: ['MESSENGER_REPORT', 'MESSENGER_DELIVERY'],
				required: true,
				description: 'Event types to subscribe to. One Bi-Way callback URL is registered per selected event type.',
			},
		],
	};

	// ── Webhook lifecycle ──────────────────────────────────────────────────────

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as { callbackIds?: Record<string, number> };
				return !!(staticData.callbackIds && Object.keys(staticData.callbackIds).length > 0);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('biwayMessengerApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
				const eventTypes = this.getNodeParameter('eventTypes') as string[];

				const callbackIds: Record<string, number> = {};

				for (const eventType of eventTypes) {
					const response = await this.helpers.requestWithAuthentication.call(
						this,
						'biwayMessengerApi',
						{
							method: 'POST',
							uri: `${baseUrl}/system/callback`,
							body: { url: webhookUrl, event: eventType, grouped: false },
							json: true,
						},
					) as IDataObject;

					callbackIds[eventType] = response.id as number;
				}

				const staticData = this.getWorkflowStaticData('node') as { callbackIds?: Record<string, number> };
				staticData.callbackIds = callbackIds;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as { callbackIds?: Record<string, number> };
				const callbackIds = staticData.callbackIds;

				if (!callbackIds) return true;

				const credentials = await this.getCredentials('biwayMessengerApi');
				const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

				for (const id of Object.values(callbackIds)) {
					try {
						await this.helpers.requestWithAuthentication.call(this, 'biwayMessengerApi', {
							method: 'DELETE',
							uri: `${baseUrl}/system/callback/${id}`,
							json: true,
						});
					} catch {
						// continue removing remaining callbacks even if one fails
					}
				}

				delete staticData.callbackIds;
				return true;
			},
		},
	};

	// ── Inbound webhook handler ────────────────────────────────────────────────

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const selectedEvents = this.getNodeParameter('eventTypes') as string[];

		const rawEvents = Array.isArray(body.events) ? (body.events as IDataObject[]) : [];

		const filtered = rawEvents.filter(
			(event) => selectedEvents.includes(event.event as string),
		);

		if (filtered.length === 0) {
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [filtered.map((event) => ({ json: event }))],
		};
	}
}
