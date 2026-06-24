# n8n-nodes-biway-messenger

An [n8n](https://n8n.io/) community node for the [Bi-Way Messaging API](https://services.bi-way.fr).

Send SMS, RCS and email messages, manage contacts, templates, chatbot triggers and receive inbound
events — all from n8n workflows.

## Installation

In your n8n instance go to **Settings → Community nodes → Install** and enter:

```
n8n-nodes-biway-messenger
```

## Credentials

Create a **Bi-Way Messenger API** credential with your long-lived API token and (optionally) a
custom base URL if you are using a self-hosted Bi-Way instance.

## Nodes

### Bi-Way Messenger (action)

| Resource | Operations |
|---|---|
| Asset | Upload |
| Account | Create |
| Customer | Create |
| Callback URL | Register, Delete |
| RCS Agent | Declare |
| Contact | Create Group, Import File |
| Template | Create |
| Chatbot Trigger | Create |
| Message | Send, Broadcast |

### Bi-Way Messenger Trigger

Registers a webhook with the Bi-Way API and emits one item per inbound event. Supported event
types: `MESSENGER_REPORT`, `MESSENGER_DELIVERY`, `CHATBOT_STATE`, `CHATBOT_CAPABILITIES_CHECK`,
`ACCOUNT_STATE`, `CUSTOMER_STATE`, `IMPORT_TASK_STATE`.

The webhook is automatically registered when the workflow is activated and deregistered when it is
deactivated.

## License

MIT
