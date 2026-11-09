# Template submission pack

Working document for submitting the workflows of [`examples/`](../examples/README.md) to the n8n template
library. It is not part of the npm package.

Rules read on 2026-11-02:
[Create workflow templates](https://docs.n8n.io/contribute/create-templates.md),
[Template submission guidelines](https://docs.n8n.io/contribute/create-templates/submission-guidelines.md),
[Add sticky notes to templates](https://docs.n8n.io/contribute/create-templates/sticky-note-guidelines.md).

## Two rules for every text below

**Medical cases: the reminder confirms, it does not book.** Never present online booking or online rebooking by
the patient, in a title, a description, a note or a screenshot. A cancelled appointment goes back to the team, who
call back.

**Reviews: everyone who answers gets the link.** Google does not allow businesses to
["discourage or prohibit negative reviews, or selectively solicit positive reviews from customers"](https://support.google.com/contributionpolicy/answer/7400114).
Never describe the review workflow as sending only happy customers to Google.

The portal generates the title and the description by itself. The texts below are the reference to check what it
generates against these two rules and against the limits of each workflow.

## Submission order

Submit one template at a time and wait for its approval. After three approved templates, n8n makes you a verified
creator and accepts batches of four.

1. Appointment reminder
2. Review request
3. Order notifications
4. Inbound reply to team inbox
5. Form to welcome message
6. Weezevent ticket holders

The form comes late because it has three nodes, and n8n asks more of short workflows: "a trigger connected to a single
action" needs "more context or reusable logic". If it is refused, nothing else depends on it. Weezevent comes last: its
API is reserved to Weezevent partners, so a reviewer may not be able to run it.

## Prerequisites of every template

- A Bi-way account and an API key (Settings › Security › API keys), in a **Bi-Way API** credential.
- The verified community node `n8n-nodes-biway-messenger`, installed
  [from the nodes panel](../README.md#installation). Verified community nodes work on n8n Cloud and self-hosted.
- For RCS, an RCS agent launched by the French operators (check with RCS Agent › Get Status). Without one, set the
  Bi-way nodes to an SMS channel, and Content to Text where they send a card.

## Templates

### 1. Appointment reminder

- **File**: [`examples/appointment-reminder.json`](../examples/appointment-reminder.json), 13 nodes
- **Title**: Confirm appointments by RCS or SMS from Google Sheets with Bi-way
- **Short description**: Remind customers of tomorrow's appointments by RCS or SMS, record their answer in Google
  Sheets and tell your team about cancellations and call backs.
- **Categories (proposal)**: Support
- **Also needed**: a Google Sheets credential and a sheet with the tab `Appointments` and the columns `Date`, `Time`,
  `First name`, `Phone`, `Status`; an SMTP credential; an n8n reachable over HTTPS for the answers.
- **Screenshot**: [`examples/images/appointment-reminder.png`](../examples/images/appointment-reminder.png)

**Long description**

> Reduce no-shows without phoning every customer. Every evening, this workflow reads tomorrow's appointments from a
> Google Sheet and sends each customer a reminder through Bi-way: an RCS message with **Confirm**, **Cancel** and
> **Call me** buttons, or an SMS asking for YES or NO.
>
> A second entry point handles each answer. It updates the `Status` column, answers the customer, and emails your team
> for a cancellation or a call back. The reminder only confirms: there is no online rebooking, your team calls back to
> find another time.
>
> Limits: RCS only reaches French mobile operators. The sheet is matched on `Phone`, so keep one appointment per number.
> A refused number does not stop the others. Running the reminder twice sends it twice.

### 2. Review request

- **File**: [`examples/review-request.json`](../examples/review-request.json), 9 nodes
- **Title**: Ask for a rating by RCS or SMS, then share your Google review link with Bi-way
- **Short description**: Ask yesterday's customers for a rating by RCS or SMS, share your Google review link with
  everyone who answers, and alert your team about low ratings.
- **Categories (proposal)**: Marketing
- **Also needed**: a Google Sheets credential and a sheet with the tab `Visits` and the columns `Date`, `First name`,
  `Phone`; the review link of your Google Business Profile; an SMTP credential; an n8n reachable over HTTPS for the answers.
- **Screenshot**: [`examples/images/review-request.png`](../examples/images/review-request.png)

**Long description**

> Collect more reviews and hear about problems first. Every morning, this workflow reads yesterday's visits from a Google
> Sheet and asks each customer for a rating from 1 to 5, with RCS buttons or by SMS.
>
> A second entry point starts on every received message and keeps only the ratings. Everyone who answers gets the link to
> your Google reviews. A 1 or 2 also gets an apology, and your team receives an email so that someone contacts the
> customer. Keep the link on both branches: Google does not allow asking only happy customers.
>
> Limits: RCS only reaches French mobile operators. Any lone figure from 1 to 5 counts as a rating, even without a recent
> request. A refused number does not stop the others. Running the request twice sends it twice.

### 3. Order notifications

- **File**: [`examples/order-notifications.json`](../examples/order-notifications.json), 4 nodes
- **Title**: Send WooCommerce shipping updates by RCS card or SMS with Bi-way
- **Short description**: When a WooCommerce order is completed, send the customer an RCS card with a tracking button, or
  an SMS with the tracking link.
- **Categories (proposal)**: Support
- **Also needed**: a WooCommerce credential; the tracking page of your carrier.
- **Screenshot**: [`examples/images/order-notifications.png`](../examples/images/order-notifications.png)

**Long description**

> Answer "where is my parcel?" before customers ask. When an order changes to completed, this workflow puts the customer's
> phone number in international format, builds the tracking link and sends an RCS card with a **Track my parcel** button
> through Bi-way. Phones that cannot receive RCS get an SMS with the tracking link.
>
> Limits: RCS only reaches French mobile operators, and the phone number conversion only knows French numbers. WooCommerce
> reports every change of an order, so a completed order changed again sends a new message.

### 4. Inbound reply to team inbox

- **File**: [`examples/inbound-to-team-inbox.json`](../examples/inbound-to-team-inbox.json), 6 nodes
- **Title**: Route customer SMS and RCS messages to the right team mailbox with Bi-way
- **Short description**: Email every message customers send to your Bi-way numbers to the billing, delivery or customer
  service mailbox, chosen by keywords.
- **Categories (proposal)**: Support
- **Also needed**: an SMTP credential and the three mailboxes; an n8n reachable over HTTPS.
- **Screenshot**: [`examples/images/inbound-to-team-inbox.png`](../examples/images/inbound-to-team-inbox.png)

**Long description**

> Keep answering customers from your usual mailboxes. Every message a customer sends to your Bi-way numbers or RCS agent
> starts this workflow. Button taps are skipped, since the workflow that sent the buttons handles them. Typed messages are
> routed by keywords, in French and English, to billing, delivery, or customer service for the rest. The chosen mailbox
> receives the sender, the number, the channel, the date and the message.
>
> Limits: answering the email does not reach the customer, reply from Bi-way. Bi-way sends each received message to every
> workflow listening, so typed answers meant for another workflow are emailed too. Bi-way does not send an event again if
> your n8n cannot be reached.

### 5. Form to welcome message

- **File**: [`examples/form-welcome-message.json`](../examples/form-welcome-message.json), 3 nodes
- **Title**: Save form sign-ups as Bi-way contacts and send a welcome message by RCS
- **Short description**: Collect sign-ups with an n8n form, create or update the contact in Bi-way by phone number, and
  send a welcome message by RCS or SMS.
- **Categories (proposal)**: Marketing
- **Also needed**: nothing more. Add a consent field if your privacy policy asks for one.
- **Screenshot**: [`examples/images/form-welcome-message.png`](../examples/images/form-welcome-message.png)

**Long description**

> Grow a contact list from a simple form, for a newsletter, a loyalty program or an event. An n8n form collects the first
> name, last name, phone number and email address. The workflow creates the contact in Bi-way, or updates it when the phone
> number is already known so that no duplicate appears, then sends a welcome message by RCS with a button. Phones that
> cannot receive RCS get the fallback SMS of your account.
>
> Limits: RCS only reaches French mobile operators. The phone number must be in international format: the form does not
> check it, and Bi-way refuses another format. Someone who sends the form again gets the welcome message again.

### 6. Weezevent ticket holders

- **File**: [`examples/weezevent-ticket-holders.json`](../examples/weezevent-ticket-holders.json), 9 nodes
- **Title**: Send Weezevent ticket holders their practical information by RCS or email with Bi-way
- **Short description**: Every 15 minutes, save the new participants of a Weezevent event as Bi-way contacts and send
  them an RCS card, or the same card by email when they gave no mobile number.
- **Categories (proposal)**: Marketing
- **Also needed**: a Weezevent API key, which Weezevent grants to its partners, and an access token obtained once with
  it, in a Custom Auth credential; the ID of the event; the **Mobile phone** field in its registration form for RCS; an
  email channel on the Bi-way account for the others.
- **Screenshot**: [`examples/images/weezevent-ticket-holders.png`](../examples/images/weezevent-ticket-holders.png)

**Long description**

> Send ticket holders their practical information without exporting lists. Every 15 minutes, this workflow asks
> Weezevent for the participants registered since its last run, with their answers to the registration form, and saves
> each one as a Bi-way contact, in the contact group of your choice. Participants who gave a mobile number get an RCS
> card with a link to your practical information and a map of the venue; the others get the same card by email.
>
> Limits: the Weezevent API is reserved to Weezevent partners. Only new registrations are fetched, up to 500 per run, and
> the memory of the last run only works in published runs. RCS only reaches French mobile operators.

**Tested**

- **Credentials instead of parameters.** The login, password and API key serve once, to get a persistent access
  token. The API key and that token go in a Custom Auth credential, so the workflow never logs in, as Weezevent asks.
- **The v3 API.** `/v3/evenement/:id/participants?loadFormAnswers=1` returns the form answers in the same call, and
  `last_update` keeps the participants registered after the date. The workflow fetches with a one-hour overlap and
  remembers the participants already handled, so none gets the message twice.
- **Checked on a test event (2026-11-04).** Weezevent stores and compares `last_update` in UTC, so the workflow
  writes it in UTC. Weezevent's own **Mobile phone** field comes in `form` as `portable`, written `+33 6 12 34 56 78`;
  a participant registered without it has no `portable` key.
- **Run with real sends (2026-11-04).** The JSON as shipped, against the test event and a Bi-way test account: the
  RCS card reached a phone on SFR, and the email arrived through the account's SMTP channel. Bi-way refuses an email
  address with a `+` or a top-level domain longer than four letters (`.paris`): use another address to test.

## Checks

### Against n8n's rules

Checked by script on the six files, then in the editor on the screenshots.

| Rule | State |
|---|---|
| English | Yes |
| One yellow note, top left, 100 to 300 words, with `### How it works`, `### Setup`, `### Customization` | Yes: 237 to 296 words |
| Who it helps, the result, the limits | Yes, in the note and repeated above |
| From four nodes: white notes over the nodes, short `##` title, under 50 words | Yes. The form has three nodes and none |
| Community node: package, tested version, installation link | Yes |
| Descriptive node names | Yes |
| Credentials, personal addresses, sheet IDs, webhook URLs, pinned data | None. `webhookId` values stay: random, they point to nothing |
| Useful error handling | One refused number does not stop a daily send (`onError` on the sends looping over a sheet); limits stated in the note |
| Values to change in an Edit Fields node | Not used: n8n says "where practical", and Setup lists each value. To revisit if a review asks |

### Run in a local n8n

Local n8n 2.45.4, with the JSON files as shipped. The Bi-way nodes really run, against a stand-in server on the machine.
Triggers, Google Sheets and email nodes are pinned. Nothing leaves the machine.

| Template | Cases, all passed |
|---|---|
| Appointment reminder | Confirm, Cancel and Call me buttons; typed YES and NO; another message; no appointment; two appointments; a refused number between two others |
| Review request | Each rating from 1 to 5 by button; typed 4 and 2; another message; typed 6; no visit; two visits; a refused number between two others. Every answer carries the review link |
| Order notifications | Completed order; card with an image from a URL; refused number, with the error shown; order still in progress |
| Inbound reply to team inbox | Billing keyword, delivery keyword, anything else, button tap |
| Form to welcome message | New contact; known contact, updated |

### Checked with real accounts

n8n asks to check the final result in the destination service, for each template before submitting it. The version
named in the notes, 0.3.0, is published since 2026-11-04.

- [x] Appointment reminder: done on 2026-11-09 on n8n Cloud 3.1.0 with 0.3.0, the JSON as shipped, a real Google Sheet,
      SMTP and RCS on the maintainer's phone. Confirm, Cancel and Call me tapped: `Status` set to Confirmed, then
      Cancelled, an answer sent each time, both team emails sent. `Date` must really be plain text: a date typed in a
      default column is converted, and no row matches
- [x] Review request: done on 2026-11-09 on n8n Cloud 3.1.0 with 0.3.0, same setup. 5 and 1 tapped, 4 typed: the review
      link on both branches, the apology and the team email for 1. Tapping the review button also reaches the trigger,
      as `n8n_open_url_1`: rated 0 and skipped
- [x] Order notifications: done on 2026-11-04, the JSON as shipped on n8n 2.45.4 with a local WooCommerce 11.2.1 shop
      (WordPress 7.1.4) and a Bi-way test account. The trigger registered its webhook in the shop; an order created
      as Processing was filtered out, then completed: the card reached a phone. The button carries the placeholder
      tracking link
- [x] Inbound reply to team inbox: done on 2026-11-09 on n8n Cloud 3.1.0 with 0.3.0: a billing, a delivery and another
      message, each routed and its email received. The button tap was not run on Cloud
- [x] Weezevent ticket holders: done on 2026-11-04, see [above](#6-weezevent-ticket-holders)
- [x] Form to welcome message: done on 2026-11-09 on n8n Cloud 3.1.0 with 0.3.0: the form sent twice, one contact in
      Bi-way, two welcome messages received, the button link opens. The number was already a contact, so both runs
      updated it: the creation was not run on Cloud
- [x] Imported once more on n8n Cloud 3.1.0 (2026-11-09): the four templates above, as on `main`, with only the
      credentials, sheet, addresses and links set. Order notifications and Weezevent were not run on Cloud: their notes
      name n8n 2.45.4 only
