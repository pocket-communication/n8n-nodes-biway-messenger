# n8n-nodes-biway-messenger

n8n community package of Bi-Way (Pocket Communication): the "Bi-Way SMS/RCS" node, the
"Bi-Way SMS/RCS Trigger" node and the "Bi-Way API" credential (API key: token + secret, HTTP Basic).
Programmatic style, built on the `npm create @n8n/node` template.

## Rules

- The source of truth for requests and answers is the code of the Bi-Way services
  (`web-biway-services/branches/bi-way-services`, `src/tools/<tool>/class/<Service>.class.php`). The
  PHP samples (`bi-way-sample-php8`) are a catalogue of use cases, not a contract. Never add a field
  or an endpoint that the services do not read or return.
- Do not change the Bi-Way API contract from this repository.
- English only in the node, the credential, the README and the docs in this repository, except
  `docs/integration-n8n-fr.md` (French page for bi-way.fr). Say "RCS" explicitly; the brand is
  written "Bi-Way".
- SMS and RCS only: no email wording, format or option in the node or its documentation.
- Single items are picked with resource locators ("From List" / "By ID",
  `descriptions/ResourceLocators.ts`); inside a collection, read them with `locatorValue()`.
- No runtime dependency, no `process.env`, no file system access (verification rules).
- Never publish to npm, push a tag or submit to the Creator Portal: the maintainer does it.

## Commands

- `npm run lint`: rules of the official scanner (strict / cloud config).
- `npm run build`: compiles to `dist/`.
- Local n8n (2.x needs Node 24 or later): link this repository as
  `<N8N_USER_FOLDER>/.n8n/custom/node_modules/n8n-nodes-biway-messenger`, run `npm run build`, start
  n8n. Locally the node types are `CUSTOM.biway` and `CUSTOM.biwayTrigger`; once installed from npm
  they are `n8n-nodes-biway-messenger.biway` and `n8n-nodes-biway-messenger.biwayTrigger` (convert
  example workflows before importing them locally).
- The trigger needs a public HTTPS URL: start n8n with `WEBHOOK_URL` set to a tunnel address.
- CI (`.github/workflows/ci.yml`) runs `npm ci` with the npm of Node LTS: regenerate
  `package-lock.json` with that npm version (`npx npm@<version> install --package-lock-only`).

## Branches

One branch per phase, each started from the previous one (`phase-1-verification`,
`phase-2-readme`, …) and pushed at the end of its phase. CI only runs on `main` and pull requests,
so run `npm run lint` and `npm run build` locally before pushing. Before the release, `main`
fast-forwards to the last phase branch.

## Roadmap publication

Audit details: [docs/verification-checklist.md](docs/verification-checklist.md).

### Phase 1 — Verification audit (branch `phase-1-verification`)
- [x] Official documentation read online (submission, verification guidelines, UX guidelines)
- [x] Checklist written (`docs/verification-checklist.md`)
- [x] Lint and official scanner rules pass on sources and tarball
- [x] UX fixes: operation actions, quoted field names, error wording, `[Item X]`
- [x] Simplify option on RCS Scenario Create, Get and Get Many
- [x] Publish workflow (template, tags `*.*.*`) and secrets documented
- [x] Resource Locators for template, contact group, scenario and gallery image
- [x] SMS and RCS only: no email wording, format or option left in the node

### Phase 2 — README and French page
- [x] README in English: pitch, differentiators (trigger for replies and button taps, self-hosted
      n8n), "Get an API key" (`{{TRIAL_SIGNUP_URL}}` placeholder), installation, credentials,
      operations, examples, compatibility, API documentation, support
- [x] No email in the README (recipients, HTML templates, contact matching)
- [x] Note that an `error` event with `fallback: "sms"` can come before `sent`
- [x] CHANGELOG: "Unreleased" merged into 0.1.0, with the phase 1 changes (resource locators,
      Simplify, SMS/RCS only, contacts matched by phone number, no template attachments)
- [x] `docs/integration-n8n-fr.md` for bi-way.fr

### Phase 3 — Example workflows (`examples/`)
File names already linked from the README: `appointment-reminder.json`, `appointment-reply.json`,
`review-request.json`, `order-notifications.json`, `inbound-to-team-inbox.json`,
`form-welcome-message.json`.
- [ ] Appointment reminder with quick replies, and the reply workflow (no online rebooking)
- [ ] Review request with routing
- [ ] E-commerce order notifications (card, tracking button, SMS fallback)
- [ ] Inbound reply to team inbox
- [ ] Form to welcome message (contact create or update)
- [ ] `examples/README.md` with audience and canvas screenshots

### Phase 4 — Validation
- [ ] Every example imported in local n8n without missing node or parameter issue
- [ ] Every operation and example run end to end with the test account
- [ ] Review as a newcomer (two-minute test)
- [ ] Final recap and release command

### Release (maintainer)
- [ ] `{{TRIAL_SIGNUP_URL}}` replaced
- [ ] Phases merged into `main`, CI green
- [ ] `NPM_TOKEN` still valid (expires around 2026-11-03), or replaced
- [ ] Tag `0.1.0` pushed: `git tag 0.1.0 && git push origin 0.1.0`
- [ ] Trusted Publisher configured on npmjs.com, `NPM_TOKEN` secret deleted and token revoked
- [ ] `npx @n8n/scan-community-package n8n-nodes-biway-messenger` passes
- [ ] Submitted on the n8n Creator Portal
