<p align="center">
  <img src="docs/images/biway.png" alt="Bi-Way" width="96" height="96">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="docs/images/pocket-communication.png" alt="Pocket Communication" width="96" height="96">
</p>

# Bi-Way SMS/RCS for n8n

Send SMS and RCS rich messages from [n8n](https://n8n.io/): cards and carousels with images,
suggestion buttons, your verified brand as the sender, and a fallback SMS when a phone cannot receive
RCS.

`n8n-nodes-biway-messenger` is the n8n community package of [Bi-Way](https://www.bi-way.fr/), the
messaging platform of Pocket Communication.

> **RCS is currently available on French mobile operators only** (French phone numbers). For other
> numbers, and for phones that cannot receive RCS, Bi-Way can send an SMS instead, or let your
> workflow decide (see [RCS with your own fallback](#rcs-with-your-own-fallback)).

- [Why Bi-Way in n8n](#why-bi-way-in-n8n)
- [Get an API key](#get-an-api-key)
- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Bi-Way SMS/RCS Trigger](#bi-way-smsrcs-trigger)
- [RCS with your own fallback](#rcs-with-your-own-fallback)
- [RCS scenarios](#rcs-scenarios)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [API documentation and support](#api-documentation-and-support)

## Why Bi-Way in n8n

- **Two-way conversations.** The Bi-Way SMS/RCS Trigger starts a workflow when a customer replies or
  taps a suggestion button, and tells you which button. Delivery and read reports arrive the same
  way, so a workflow can follow up on messages that were not delivered or not read.
- **RCS with a safety net.** When a phone cannot receive RCS, Bi-Way sends the fallback SMS of your
  account, an SMS written in the node, or nothing at all so that your workflow decides.
- **A verified sender.** RCS messages come from your RCS agent: your brand name and logo, verified by
  Google and approved by the mobile operators.
- **Your data stays in France.** Bi-Way is run by Pocket Communication, a French company subject to
  the GDPR, and hosted in France. With a self-hosted n8n, phone numbers and messages only travel
  between your servers and Bi-Way: no third-party automation cloud is involved.

## Get an API key

1. Create your Bi-Way account: [v3.bi-way.fr/signup](https://v3.bi-way.fr/signup)
2. In Bi-Way, open **Settings › Security › API keys**
   ([v3.bi-way.fr/settings/security](https://v3.bi-way.fr/settings/security)).
3. Click **Create a key**, give it a name (for example `n8n`), and copy the **token** and the
   **secret**. The secret is shown only once.

You can revoke a key at any time from the same page; the workflows that use it then stop working.
The page also lists the **Account key**, the key the former Bi-Way application shows: it works too,
but cannot be revoked, so prefer a key of your own.

What else each operation needs:

| Operation | Needs |
|---|---|
| Message › Send, Message › Broadcast | A Bi-Way plan with API access. Only the channels enabled on your account are offered; channels that need a sender use the default sender of your account unless you pick one. |
| Anything RCS: RCS channel, cards and buttons, keyword replies, scenarios | Recipients on French mobile operators, and an RCS agent declared by your company and launched by the operators. Declare it on the [RCS declaration form](https://app.bi-way.fr/rcs-registration/) or in your [Bi-Way RCS settings](https://v3.bi-way.fr/settings/chatbot); a declaration fee applies. **RCS Agent › Get Status** tells you where it stands. |
| Template, Asset and Contact operations | The matching permissions on your Bi-Way user profile. |
| Bi-Way SMS/RCS Trigger | An n8n instance reachable from the internet over HTTPS. |

When something is missing, the node stops with a message that says what to do.

## Installation

- **Self-hosted n8n**: as an owner or admin, open **Settings › Community Nodes › Install**, enter
  `n8n-nodes-biway-messenger` and confirm. See the n8n
  [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for the manual
  installation (queue mode, Docker images built in advance).
- **n8n Cloud**: only community nodes verified by n8n can be installed there. This package will be
  available once n8n has verified it.

Then add the **Bi-Way SMS/RCS** node to a workflow: search for "Bi-Way", "SMS" or "RCS" in the nodes
panel.

## Credentials

The **Bi-Way API** credential uses the API key: paste the **token** and the **secret** created in
[Get an API key](#get-an-api-key). Leave **Base URL** unchanged unless Bi-Way support asks you to
change it. n8n tests the key when you save the credential.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Message | Send | Sends a text, an RCS card or an RCS carousel to one phone number, written in the node or taken from a template, with RCS buttons if needed. Returns the ID of the sending, which status reports carry as `order_id`. |
| Message | Broadcast | Sends the same content to phone numbers, contacts and contact groups, now or later, optionally in segments. |
| Template | Create | Creates a message template: text (with RCS buttons if needed), RCS card or RCS carousel. Reuses the template with the same title by default. |
| Asset | Upload | Uploads a file to your Bi-Way gallery (2 MB for images and documents, 30 MB for videos). Returns its ID, to show it in an RCS card. |
| Contact | Create | Creates a contact from the columns of your account. Recognizes an existing contact by its phone number and, by default, returns it instead of creating a duplicate (or updates it, or stops). |
| Contact | Create Group | Creates a contact group. Reuses the group with the same name by default. |
| Contact | Import File | Imports contacts from a CSV, XLS or XLSX file into a group. The import runs in the background: the node returns the ID of the import task. |
| RCS Agent | Create Keyword Reply | Replies with a template when a customer sends a keyword to your RCS agent, or taps a suggestion button that carries it. Reuses the reply to the same keyword by default. |
| RCS Agent | Get Status | Returns the state of your RCS declaration and of your RCS agent at each operator, and the next step to take. |
| RCS Scenario | Create, Get, Get Many, Activate, Deactivate, Delete | Manages the scenarios of your RCS agent (see [RCS scenarios](#rcs-scenarios)). Create, Get and Get Many return a simplified output unless you turn **Simplify** off. Delete removes the scenario only, not its templates nor its keyword replies. |
| RCS Scenario | Start | Sends the first message of a scenario to a phone number. |

Good to know:

- **Content, then source**: Send and Broadcast first ask for the **Content** (*Text*, *Card* or
  *Carousel*), then whether you write it in the node (*Raw Message*) or use a *Template*. A raw text
  has a body and RCS buttons; a card a title, a body, an image and buttons; a carousel 2 to 10 cards.
  The template list only shows the templates of the chosen content that the channel can carry, and a
  template of another content or for another channel is refused before sending.
- **Picking items**: templates, contact groups, scenarios and gallery images are chosen **From List**
  (search by name or ID) or **By ID**, for example to map an ID returned by an earlier node.
- **Phone numbers** are written in international format, for example `+33612345678`. Numbers typed
  in Broadcast are not saved as contacts.
- **Personalization tags** of Bi-Way work for contacts and contact groups.
- **Dates** are sent to Bi-Way in the Europe/Paris time zone, to the minute. A date without time zone
  is read in the time zone of the workflow. Bi-Way refuses dates in the past.
- **Status reports**: Broadcast asks for delivery and read reports by default (option **Status
  Reports**). They reach the Bi-Way SMS/RCS Trigger as *Message Status Updated* events.
- **RCS cards, carousels and buttons** need the RCS channel. A card has a title, a body, an image or
  a video (from your Bi-Way gallery, where it must be public, or from an HTTPS address) and 4 buttons
  at most. A carousel shows 2 to 10 such cards side by side, each with its own buttons. A text
  message takes 11 buttons at most. Button labels are 25 characters at most. Button kinds: Suggested
  Reply, Open URL, Dial and View Location.
- **Fallback SMS of an RCS message** (field **If the Phone Is Not RCS-Capable**): the fallback SMS of
  your account (default), an SMS written in the node, or nothing (see
  [RCS with your own fallback](#rcs-with-your-own-fallback)).
- **No duplicates when a workflow runs again**: Template › Create, Contact › Create Group, Contact ›
  Create and RCS Agent › Create Keyword Reply reuse the existing item by default (field **If …
  Already Exists**). Names are compared ignoring case and surrounding spaces; contacts are matched on
  their exact phone number, as stored in Bi-Way.
- The node can be used as a tool by AI agents.

## Bi-Way SMS/RCS Trigger

The trigger registers its webhook URL on your Bi-Way account when the workflow is published (activated,
on n8n 1), and removes it when the workflow is unpublished. It adds its URL next to the callback URLs
your account may already have: it never replaces them.

| Event | Starts the workflow when |
|---|---|
| Message Status Updated | A message you sent was delivered, read, refused, clicked or expired, or could not go through RCS. |
| Message Received | A customer sent a message, replied to one of your messages or tapped a suggestion button. |
| Contact Import State Changed | A contact import progressed or ended. |
| RCS Agent State Changed | Your RCS agent changed state at a mobile operator. |
| RCS Capability Check Completed | Bi-Way finished checking which phone numbers can receive RCS. |
| Account State Changed | Your Bi-Way account was enabled or disabled. |

Each event becomes one item.

**Message Received** items carry the customer's phone number (`address`), the name of the contact
when Bi-Way knows it, otherwise the phone number (`sender`), the text (`message`), the `channel`, and
`keyword`: the keyword of the RCS button the customer tapped, or `null` for a typed message. With the
**Button Keywords** option, the workflow only starts for the buttons you list.

**Message Status Updated** items carry the `order_id` (the ID returned by Message › Send or
Broadcast), the `message_id`, the `channel`, the recipient's phone number (`address`), the dates
`sent_at`, `delivered_at` and `read_at`, and a `status`:

| `status` | Meaning |
|---|---|
| `sent`, `error` | The message left Bi-Way, or could not. |
| `delivered`, `undelivered`, `rejected` | Delivery report of the operator. |
| `read`, `click`, … | Read report, for the channels that have one. |
| `unsupported` | RCS was not possible (phone not RCS-capable) and **no SMS was sent**: handle it in your workflow. |
| `expired` | The RCS message was not delivered before its expiry. |

They also carry `fallback`: `"sms"` when a fallback SMS was sent instead of the RCS message, `"none"`
when no SMS was sent, `null` otherwise. When Bi-Way falls back to SMS, an event with
`status: "error"` and `fallback: "sms"` can arrive shortly before the `sent` of the SMS: do not treat
it as final, wait for the delivery report.

Good to know:

- Bi-Way sends the events of the **whole account**, including messages not sent from n8n.
- The webhook URL must be reachable from the internet over **HTTPS**. When n8n runs behind a proxy or
  a tunnel, set the `WEBHOOK_URL` environment variable of n8n.
- The registered URL carries a token derived from the secret of the API key; calls without it are
  refused. If you change the key of the credential, unpublish the workflow and publish it again.

## RCS with your own fallback

By default, when a phone cannot receive RCS, Bi-Way sends the fallback SMS of your account. To decide
in n8n instead:

1. **Bi-Way SMS/RCS › Message › Send** on the RCS channel, with **If the Phone Is Not RCS-Capable** set
   to *Send Nothing*.
2. In another workflow, **Bi-Way SMS/RCS Trigger** with the event *Message Status Updated* → **If**
   `{{ $json.status }}` is `unsupported` → **Bi-Way SMS/RCS › Message › Send** on an SMS channel to
   `{{ $json.address }}`, or anything else: a call task, a different wording, nothing at all.

## RCS scenarios

A Bi-Way scenario is a conversation driven by RCS buttons: each Suggested Reply button sends a
keyword, and a keyword reply answers it with the next message. Build one from n8n in four steps:

1. **Template › Create** for each step: content *Text*, *Card* or *Carousel*, with buttons of type
   *Suggested Reply*. Each button carries a keyword (for example `CONFIRM`, `CALL_ME`).
2. **RCS Agent › Create Keyword Reply** for each keyword: it sends the template of the next step.
3. **RCS Scenario › Create** with the first template. The scenario appears in Bi-Way, where you can
   also edit it.
4. **RCS Scenario › Start** to send the first message to a phone number.

To take over the conversation in n8n, give the last templates Suggested Reply buttons whose keywords
have **no** keyword reply, and catch them with a **Bi-Way SMS/RCS Trigger** on *Message Received* with
the **Button Keywords** option. The workflow receives the customer's phone number (`address`) and the
tapped keyword (`keyword`), and can answer with **Message › Send** or run any other action.

## Example workflows

Ready-to-import workflows are in [`examples/`](examples/README.md). They use only n8n core nodes and
the Bi-Way nodes; replace the placeholders (phone numbers, sheet IDs, templates) with yours.

| Workflow | What it does |
|---|---|
| [Appointment reminder](examples/appointment-reminder.json) | Reminds customers of tomorrow's appointments with quick-reply buttons. |
| [Appointment reply](examples/appointment-reply.json) | Handles the buttons tapped on the reminder. |
| [Review request](examples/review-request.json) | Asks for a rating, sends happy customers to your Google reviews and alerts your team about unhappy ones. |
| [Order notifications](examples/order-notifications.json) | Sends an RCS card with a tracking button when a WooCommerce order ships, with a fallback SMS. |
| [Inbound reply to team inbox](examples/inbound-to-team-inbox.json) | Routes customer replies to the right team by keyword. |
| [Form to welcome message](examples/form-welcome-message.json) | Creates or updates the contact from a form and sends a welcome message. |
| [Weezevent ticket holders](examples/weezevent-ticket-holders.json) | Fetches the new participants of a Weezevent event, adds them to a contact group and, when the registration form asks for their phone number, sends them an RCS message. Needs access to the Weezevent API, which Weezevent grants to its partners. |

## Compatibility

- Tested with n8n 2.45.4, self-hosted. On n8n 1, "publish" and "unpublish" read "activate" and
  "deactivate".
- n8n nodes API version 1, no runtime dependency.
- RCS reaches phones on French mobile operators only; SMS reach the destinations of your Bi-Way plan.

## API documentation and support

- [Bi-Way API documentation](https://services.bi-way.fr/openapi/), for the requests behind each
  operation and the advanced **Extra (JSON)** and **Filters (JSON)** options.
- [RCS declaration form](https://app.bi-way.fr/rcs-registration/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Issues and questions about this package:
  [GitHub issues](https://github.com/pocket-communication/n8n-nodes-biway-messenger/issues)
- Bi-Way support: [tech@pocketcommunication.com](mailto:tech@pocketcommunication.com)

A French presentation for bi-way.fr is in [docs/integration-n8n-fr.md](docs/integration-n8n-fr.md).

## License

[MIT](LICENSE.md) © Pocket Communication
