<p align="center">
  <img src="docs/images/biway.png" alt="Bi-Way" width="96" height="96">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="docs/images/pocket-communication.png" alt="Pocket Communication" width="96" height="96">
</p>

# Bi-Way SMS/RCS for n8n

`n8n-nodes-biway-messenger` — [n8n](https://n8n.io/) community nodes for [Bi-Way](https://www.bi-way.fr/),
the SMS and RCS messaging platform of Pocket Communication: send SMS and RCS messages (rich cards,
buttons, scenarios), manage message templates, gallery files and contacts, and start workflows when
Bi-Way sends an event (status reports, replies, imports).

> **RCS is currently available on French mobile operators only** (French phone numbers). For the other
> numbers, or phones that cannot receive RCS, Bi-Way can send an SMS instead, or let your workflow
> decide (see [RCS with your own fallback](#rcs-with-your-own-fallback)).

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Credentials](#credentials)
- [Bi-Way SMS/RCS node](#bi-way-smsrcs-node)
- [Bi-Way SMS/RCS Trigger](#bi-way-smsrcs-trigger)
- [RCS with your own fallback](#rcs-with-your-own-fallback)
- [RCS scenarios](#rcs-scenarios)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the
n8n community nodes documentation, and install the package `n8n-nodes-biway-messenger`.

## Prerequisites

This package does not create Bi-Way accounts nor subscribe to plans: you need an existing Bi-Way
account. What each operation requires:

| Operation | Requires |
|---|---|
| Every operation | An API key of your Bi-Way account (see [Credentials](#credentials)). |
| Message › Send, Message › Broadcast | A Bi-Way plan with API access ([sign up](https://v3.bi-way.fr/signup) or ask Bi-Way support). Only the channels enabled on your account work; channels that need a sender use the default sender of your account unless you pick one. |
| Sending on the RCS channel, RCS cards and buttons, RCS Agent › Create Keyword Reply, RCS Scenario | Recipients on French mobile operators (RCS is not available elsewhere yet), and an RCS agent declared by your company and launched by the mobile operators. Declare it on the [RCS declaration form](https://app.bi-way.fr/rcs-registration/) or in your [Bi-Way RCS settings](https://v3.bi-way.fr/settings/chatbot); a declaration fee applies. Check its state with **RCS Agent › Get Status**. |
| Template › Create, Asset › Upload, Contact › Create, Contact › Create Group, Contact › Import File | The matching permissions on your Bi-Way profile. |
| Bi-Way SMS/RCS Trigger | An n8n instance reachable from the internet over HTTPS. |

When a prerequisite is missing, the node stops with an explicit message telling what to do.

## Credentials

The **Bi-Way API** credential uses an API key, made of a **token** and a **secret**:

1. Sign in to Bi-Way and open **Settings › Security › API keys**
   ([v3.bi-way.fr/settings/security](https://v3.bi-way.fr/settings/security)).
2. Click **Create a key**, give it a name (for example `n8n`) and copy the token and the secret. The
   secret is shown only once.
3. In n8n, create a **Bi-Way API** credential and paste the token and the secret. Leave **Base URL**
   unchanged unless Bi-Way support asks you to change it.

You can revoke the key at any time from the same page; the workflows using it then stop working.
The key of your account (shown as "account key") is also visible in the former Bi-Way application,
under **Mon compte**.

## Bi-Way SMS/RCS node

| Resource | Operation | What it does |
|---|---|---|
| Message | Send | Sends a message to one recipient (phone number or email address): text, template or RCS card, with RCS buttons if needed. Returns the ID of the sending. |
| Message | Broadcast | Sends a message to addresses, contacts and contact groups, now or later, optionally in segments. |
| Template | Create | Creates a message template: text (with RCS buttons if needed), HTML, media or RCS card. Reuses the template with the same title by default. |
| Asset | Upload | Uploads a file to your Bi-Way gallery (2 MB for images and documents, 30 MB for videos). Returns its ID, to attach it to messages and templates or to show it in an RCS card. |
| Contact | Create | Creates a contact from the columns of your account. Recognizes an existing contact by its phone number or email address and, by default, returns it instead of creating a duplicate (or updates it, or fails). |
| Contact | Create Group | Creates a contact group. Reuses the group with the same name by default. |
| Contact | Import File | Imports contacts from a CSV, XLS or XLSX file into a group. The import runs in the background: the node returns the ID of the import task. |
| RCS Agent | Create Keyword Reply | Replies with a template when a customer sends a keyword to your RCS agent, or taps a Suggested Reply button carrying it. Reuses the reply of the same keyword by default. |
| RCS Agent | Get Status | Returns the state of your RCS declaration and of your RCS agent at each operator, and the next step to take. |
| RCS Scenario | Create, Get, Get Many, Activate, Deactivate, Delete | Manages the scenarios of your RCS agent (see [RCS scenarios](#rcs-scenarios)). Delete removes the scenario only, not its templates nor its keyword replies. |
| RCS Scenario | Start | Sends the first message of a scenario to a phone number. |

Notes:

- **Dates** are sent to Bi-Way in the Europe/Paris time zone, to the minute. A date without time zone
  is read in the time zone of the workflow. Bi-Way refuses dates in the past.
- **Broadcast** collects delivery and read reports by default (option **Status Reports**). They reach
  the Bi-Way SMS/RCS Trigger as "Message Status Updated" events.
- **Personalization tags** of Bi-Way work for contacts and contact groups. Addresses typed in the node
  are not saved as contacts.
- **RCS cards and buttons** need the RCS channel. A card has a title, a text, an image or video (from
  your Bi-Way gallery, which must be public, or from an HTTPS address) and 4 buttons at most; a text
  message 11 buttons at most. Button labels are 25 characters at most.
- **Fallback SMS of an RCS message** (field "If the Phone Is Not RCS-Capable", RCS channel, with a
  text, a card or a template): send the fallback SMS of your account (default), send an SMS written in
  the node, or send nothing and let a workflow decide (see
  [RCS with your own fallback](#rcs-with-your-own-fallback)).
- **Templates and channels**: Send and Broadcast only list the templates the chosen channel can carry,
  and refuse a template that does not fit it (RCS cards and buttons only go through RCS; an SMS takes
  neither a subject nor attachments).
- **Duplicates**: Template › Create, Contact › Create Group, Contact › Create and RCS Agent › Create
  Keyword Reply reuse the existing item by default (field "If … Already Exists"), so that running a
  workflow again creates no duplicate. Names are compared ignoring case and surrounding spaces; contacts
  are matched on their exact phone number or email address, as stored in Bi-Way.
- The node can be used as a tool by AI agents.

## Bi-Way SMS/RCS Trigger

The trigger registers its webhook URL on your Bi-Way account when the workflow is activated, and removes
it when the workflow is deactivated. It adds its URL next to the callback URLs your account may already
have: it never replaces them.

| Event | Starts the workflow when |
|---|---|
| Message Status Updated | A message you sent was delivered, read, refused, clicked or expired, or could not go through RCS. |
| Message Received | A customer sent a message or replied to one of your messages. |
| Contact Import State Changed | A contact import progressed or ended. |
| RCS Agent State Changed | Your RCS agent changed state at a mobile operator. |
| RCS Capability Check Completed | Bi-Way finished checking which phone numbers can receive RCS. |
| Account State Changed | Your Bi-Way account was enabled or disabled. |

Each event becomes one item. A *Message Received* item also carries `keyword`: the keyword of the RCS
button the customer tapped, or `null` for a typed message. With the **Button Keywords** option, the
workflow only starts for the buttons you list.

A *Message Status Updated* item carries the `order_id` (the ID returned by Message › Send or
Broadcast), the `message_id`, the `channel`, the recipient `address` and a `status`:

| `status` | Meaning |
|---|---|
| `sent`, `error` | The message left Bi-Way, or could not. |
| `delivered`, `undelivered`, `rejected` | Delivery report of the operator. |
| `read`, `open`, `click`, … | Read report, for the channels that have one. |
| `unsupported` | RCS was not possible (phone not RCS-capable) and **no SMS was sent**: handle it in your workflow. |
| `expired` | The RCS message was not delivered before its expiry. |

It also carries `fallback`: `"sms"` when a fallback SMS was sent instead of the RCS message, `"none"`
when no SMS was sent, `null` otherwise.

Good to know:

- Bi-Way sends the events of the **whole account**, including messages not sent from n8n.
- The webhook URL must be reachable from the internet over **HTTPS**. When n8n runs behind a proxy or a
  tunnel, set the `WEBHOOK_URL` environment variable of n8n.
- The registered URL carries a token derived from the secret of the API key; calls without it are
  refused. If you change the key of the credential, deactivate and reactivate the workflow.

## RCS with your own fallback

By default, when a phone cannot receive RCS, Bi-Way sends the fallback SMS of your account. To decide
in n8n instead:

1. **Bi-Way SMS/RCS › Message › Send** on the RCS channel, with **If the Phone Is Not RCS-Capable** set
   to *Send Nothing*.
2. In another workflow, **Bi-Way SMS/RCS Trigger** with the event *Message Status Updated* → IF
   `{{ $json.status }}` is `unsupported` → **Bi-Way SMS/RCS › Message › Send** on an SMS channel to
   `{{ $json.address }}` — or do nothing at all.

## RCS scenarios

A Bi-Way scenario is a conversation driven by RCS buttons: each Suggested Reply button sends a keyword, and a
keyword reply answers it with the next message. Build one from n8n in four steps:

1. **Template › Create** for each step: format *Text* or *Card (RCS)*, with **RCS Buttons** of type
   *Suggested Reply*. Each button carries a keyword (for example `APPOINTMENT`, `CALL_ME`).
2. **RCS Agent › Create Keyword Reply** for each keyword: it sends the template of the next step.
3. **RCS Scenario › Create** with the first template. The scenario appears in Bi-Way, where you can also
   edit it.
4. **RCS Scenario › Start** to send the first message to a phone number.

To take over the conversation in n8n at the end of the path, give the last templates Suggested Reply buttons
whose keywords have **no** keyword reply, and catch them with a **Bi-Way SMS/RCS Trigger** on *Message Received*
with the **Button Keywords** option. The workflow then receives the customer's phone number (`address`) and
the tapped keyword (`keyword`), and can answer with **Message › Send** or run any other action.

## Example workflows

**1. Confirm an order by SMS.** Shop trigger (for example WooCommerce › Order Created) → **Bi-Way SMS/RCS ›
Message › Send**: channel *SMS*, recipient `{{ $json.billing.phone }}`, body
`Hello {{ $json.billing.first_name }}, your order {{ $json.number }} is confirmed.`

**2. Send a monthly SMS offer to a group.** Schedule Trigger (first Monday of the month, 9:00) →
**Bi-Way SMS/RCS › Message › Broadcast**: channel *SMS*, content *Template* (your offer template), recipients
*Contact Group* "Customers", option **Status Reports** *All*.

**3. Route customer replies to your team.** **Bi-Way SMS/RCS Trigger** with the event *Message Received* →
IF (`{{ $json.message }}` contains `STOP`) → otherwise Slack › Send Message with
`{{ $json.sender }}: {{ $json.message }}`.

**4. Import contacts from a spreadsheet, then message them.** Google Drive › Download File (XLSX) →
**Bi-Way SMS/RCS › Contact › Import File** (format *XLSX*, group "Leads", duplicate handling *Deduplicate Within
the Group*) → in another workflow, **Bi-Way SMS/RCS Trigger** with *Contact Import State Changed* → **Bi-Way SMS/RCS ›
Message › Broadcast** to the group "Leads".

**5. Hand over an RCS scenario to n8n.** Scenario built as described in [RCS scenarios](#rcs-scenarios),
whose last step offers the buttons *Call me* (`CALL_ME`) and *No thanks* (`NO_THANKS`) → **Bi-Way SMS/RCS
Trigger** with *Message Received* and **Button Keywords** `CALL_ME` → **Bi-Way SMS/RCS › Contact › Create**
(phone `{{ $json.address }}`, group "To call back") → your CRM.

## Compatibility

Uses the n8n nodes API version 1 and has no runtime dependency.

## Resources

- [Bi-Way API documentation](https://services.bi-way.fr/openapi/)
- [RCS declaration form](https://app.bi-way.fr/rcs-registration/)
- [Sign up to Bi-Way](https://v3.bi-way.fr/signup)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Support: [tech@pocketcommunication.com](mailto:tech@pocketcommunication.com)

## License

[MIT](LICENSE.md) © Pocket Communication
