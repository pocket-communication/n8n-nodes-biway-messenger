/**
 * Bi-Way services always answer in French. The node maps the error `code` to an English message
 * and a hint telling the user how to fix the problem.
 */

import { N8N_PAGE_URL } from './Links';

const HOME_URL = 'https://v3.bi-way.fr/';
const SIGNUP_URL = 'https://v3.bi-way.fr/signup';
const API_KEYS_URL = 'https://v3.bi-way.fr/settings/security';
const RCS_DECLARATION_URL = 'https://app.bi-way.fr/rcs-registration/';
const RCS_SETTINGS_URL = 'https://v3.bi-way.fr/settings/chatbot';
const SUPPORT_EMAIL = 'tech@pocketcommunication.com';

export interface BiwayErrorDescription {
	message: string;
	description: string;
}

/** `detail`: the first quoted word of the server message (a channel, a column…). */
type ErrorBuilder = (detail: string, serverMessage: string) => BiwayErrorDescription;

const NODE_BUG = `This should not happen with this node. Please report it to ${SUPPORT_EMAIL}.`;

const RCS_NEXT_STEPS = `Check your RCS agent with RCS Agent › Get Status, send by SMS in the meantime, or read the requirements on the Bi-way page for n8n (in French): ${N8N_PAGE_URL}`;

const fixed =
	(message: string, description: string): ErrorBuilder =>
	() => ({ message, description });

const ERRORS: Record<string, ErrorBuilder> = {
	// Authentication and account
	unknow_user: fixed(
		'Invalid Bi-way API key',
		`Check the token and the secret of the credential. Create a new API key in Bi-way › Settings › Security (${API_KEYS_URL}).`,
	),
	account_disabled: fixed(
		'Your Bi-way account is disabled',
		`Contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
	no_permission: fixed(
		'Your Bi-way account is not allowed to use this operation',
		'Ask the administrator of your Bi-way account to grant this permission to your profile.',
	),
	forbidden_action: fixed(
		'You are not allowed to perform this action on Bi-way',
		'The resource probably belongs to another Bi-way account.',
	),
	invalid_contract: fixed(
		'No active Bi-way plan allows sending through the API',
		`Subscribe to a plan (${SIGNUP_URL}) or contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
	services_forbidden: fixed(
		'API access is not enabled on your Bi-way plan',
		`Contact Bi-way support (${SUPPORT_EMAIL}) to enable web services on your plan.`,
	),

	// Sending
	no_valid_sender: (channel) => ({
		message: `The channel ${channel || 'you selected'} needs a sender`,
		description:
			"Pick a sender in the 'Sender Name or ID' option, or set a default sender for this channel in your Bi-way account.",
	}),
	no_channel: fixed('No channel selected', 'Select the channel used to send the message.'),
	no_valid_channel: (channel) => ({
		message: `Unknown channel ${channel}`.trim(),
		description: 'Pick a channel from the list: only the channels enabled on your account work.',
	}),
	no_valid_gateway_for_channel: (channel) => ({
		message: `The channel ${channel || 'you selected'} is not available on your account`,
		description: `Pick another channel or contact Bi-way support (${SUPPORT_EMAIL}).`,
	}),
	receiver_missing: fixed('The recipient is missing', "Fill in the 'Recipient' field."),
	receivers_missing: fixed('The recipients are missing', 'Add at least one recipient.'),
	receiver_error: fixed(
		'The address of the recipient is not valid for this channel',
		'Use a phone number in international format (e.g. +33612345678) for SMS and RCS, or an email address for email channels.',
	),
	no_valid_receivers: fixed(
		'None of the recipients can receive this message',
		'SMS and RCS need phone numbers in international format (e.g. +33612345678), email channels email addresses. Unsubscribed recipients are skipped.',
	),
	no_valid_receivers_for_channel: (channel) => ({
		message: `None of the recipients can receive messages on ${channel || 'this channel'}`,
		description:
			'SMS and RCS need phone numbers in international format (e.g. +33612345678), email channels email addresses. Unsubscribed recipients are skipped.',
	}),
	no_valid_date: fixed(
		'The send date is not valid',
		'The date must be in the future. Bi-way schedules messages in the Europe/Paris time zone, to the minute.',
	),
	message_not_created_for_channel: (channel, serverMessage) => ({
		message: `Bi-way refused the message for ${channel || 'this channel'}`,
		description: /missing property receivers/i.test(serverMessage)
			? 'None of the recipients can receive it on this channel: the contacts need a phone number (an email address on an email channel), and unsubscribed or duplicate recipients are skipped.'
			: `Bi-way answered (in French): ${serverMessage}`,
	}),
	not_enougth_credits: (channel, serverMessage) => ({
		message: `Your Bi-way credits do not cover this message on ${channel || 'this channel'}`,
		description: `Order credits from the credits panel of your Bi-way home page (${HOME_URL}) or contact Bi-way (${SUPPORT_EMAIL}). Bi-way answered: ${serverMessage}`,
	}),
	asset_not_found: fixed(
		'One of the attachments was not found',
		'Check the asset IDs: they must belong to your Bi-way gallery (see Asset › Upload).',
	),
	template_not_found: fixed(
		'The message template was not found',
		'Pick a template from the list, or create one with Template › Create.',
	),
	no_template: fixed(
		'The message template was not found',
		'Pick a template from the list, or create one with Template › Create.',
	),
	template_asset_id_not_found: fixed(
		'One of the template attachments was not found',
		'Check the asset IDs: they must belong to your Bi-way gallery.',
	),

	// RCS
	rcs_agent_missing: fixed(
		'Your Bi-way account has no RCS agent',
		`RCS needs an RCS agent declared by your company and launched by the mobile operators. ${RCS_NEXT_STEPS}`,
	),
	agent_not_found: fixed(
		'Your Bi-way account has no RCS agent',
		`Declare your RCS agent at ${RCS_DECLARATION_URL} or in your RCS settings (${RCS_SETTINGS_URL}), then check its state with RCS Agent › Get Status.`,
	),
	chat_service_not_allowed: fixed(
		'Your Bi-way plan does not include RCS',
		`Contact Bi-way (${SUPPORT_EMAIL}) to change your plan, and send by SMS in the meantime. Requirements on the Bi-way page for n8n (in French): ${N8N_PAGE_URL}`,
	),
	chatbot_not_owned: fixed(
		'This RCS agent belongs to another Bi-way account',
		'Use the API key of the account that owns the RCS agent.',
	),
	missing_trigger_attribute: (attribute) => ({
		message: `A field of the keyword reply is missing${attribute ? `: ${attribute}` : ''}`,
		description: 'Fill in the label and the keyword.',
	}),
	trigger_keyword_exists: fixed(
		'This keyword is already used on your account',
		'Choose another keyword. Bi-way compares keywords in upper case, with spaces and special characters replaced by underscores.',
	),
	unknow_trigger_type: fixed('Unknown keyword reply type', NODE_BUG),
	trigger_rule_invalid: fixed('A rule of the keyword reply is not valid', NODE_BUG),

	// Templates
	missing_template_title: fixed('The template title is missing', "Fill in the 'Title' field."),
	missing_template_format: fixed('The template format is missing', "Pick a 'Content'."),
	missing_template_body: fixed('The template body is missing', "Fill in the 'Body' field."),
	wrong_template_extra: fixed(
		'The RCS content of the template is not valid',
		"Check the cards, the buttons and the 'Extra (JSON)' option. See the Bi-way API documentation: https://services.bi-way.fr/openapi/.",
	),

	// Gallery
	no_file: fixed('No file was sent', "Check the 'Input Binary Field' name."),
	file_transfert_error: fixed(
		'The file could not be transferred to Bi-way',
		'Try again. If the file is still refused, check its size and its type.',
	),
	mime_type_missing: fixed(
		'The type of the file is unknown',
		'Make sure the binary data has a MIME type.',
	),
	unsupported_mime_type: fixed(
		'This type of file is not supported by the Bi-way gallery',
		'Upload an image, a video or a document.',
	),
	asset_type_forbidden: fixed('This type of file is not accepted', 'Executable files are refused.'),
	asset_too_large: fixed(
		'The file is too large',
		'Maximum 2 MB for images and documents, 30 MB for videos.',
	),
	not_gallery_account: fixed(
		'This gallery belongs to another Bi-way account',
		"Remove the 'Gallery ID' option to upload to your default gallery.",
	),

	// Contacts
	no_software_file: fixed('The file format is missing', NODE_BUG),
	unknow_software_file: fixed(
		'Bi-way could not read this file',
		"Pick one of the import formats of your account instead of 'Automatic' (XLS by default), and check the columns of the file. The CSV format of Bi-way is tab-separated.",
	),
	unknow_double_mode: fixed('Unknown duplicate handling mode', 'Pick a mode from the list.'),
	double_mode_not_supported: fixed(
		'This duplicate handling mode is not supported for this file format',
		'Pick another duplicate handling mode.',
	),
	no_default_group: fixed(
		'No contact group to import into',
		'Pick a contact group, or create one with Contact › Create Group.',
	),
	forbidden_entry_type: fixed(
		'Contacts are not enabled on your Bi-way account',
		`Contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
	unknow_entry_type: fixed(
		'Contacts are not enabled on your Bi-way account',
		`Contact Bi-way support (${SUPPORT_EMAIL}).`,
	),

	entry_already_exists: fixed(
		'This contact already exists in your Bi-way account',
		"Choose 'Use Existing' or 'Update It' in the 'If Contact Already Exists' field.",
	),
	entry_control_wrong_value: (detail) => ({
		message: `The value of the contact column ${detail || ''} is not valid`.replace('  ', ' '),
		description:
			'Check its format: phone numbers in international format (e.g. +33612345678), valid email addresses, dates as YYYY-MM-DD.',
	}),
	entry_control_missing_value: (detail) => ({
		message: `The contact column ${detail || ''} is required`.replace('  ', ' '),
		description: 'Map a value for this column.',
	}),
	entry_type_not_found: fixed(
		'Contacts are not available on your Bi-way account',
		`Contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
	filter_invalid: fixed('Bi-way refused the contact search', NODE_BUG),
	group_not_found: fixed(
		'The contact group was not found',
		'Pick a contact group of your account from the list.',
	),

	// Scenarios
	script_not_found: fixed(
		'The scenario was not found',
		'Pick a scenario of your account from the list.',
	),
	missing_script_attribute: fixed('The scenario title is missing', "Fill in the 'Title' field."),
	trigger_not_found: fixed(
		'The keyword reply was not found',
		'Create it with RCS Agent › Create Keyword Reply.',
	),
	property_name_missing: fixed('Bi-way received an incomplete request', NODE_BUG),
	property_value_missing: fixed('Bi-way received an incomplete request', NODE_BUG),

	// Gallery files used in cards
	no_asset: fixed(
		'The gallery file was not found',
		"Pick an image of your Bi-way gallery, or map the 'id' returned by Asset › Upload.",
	),
	not_asset_owner: fixed(
		'This gallery file belongs to another Bi-way account',
		'Pick an image of your own gallery.',
	),

	// Callbacks (trigger)
	no_url: fixed(
		'Bi-way refused the webhook URL',
		'The URL must be public and use HTTPS. When n8n runs behind a proxy or a tunnel, set the WEBHOOK_URL environment variable of n8n.',
	),
	no_event: fixed(
		'Bi-way does not support this kind of webhook registration yet',
		`Your Bi-way server is not up to date. Contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
	event_not_found: fixed('Unknown Bi-way event', NODE_BUG),
	callback_not_found: fixed(
		'The webhook registration was not found on Bi-way',
		'Unpublish the workflow and publish it again (on n8n 1, deactivate and reactivate it) to register the webhook again.',
	),
	not_callback_owner: fixed(
		'This webhook registration belongs to another Bi-way account',
		'Pick the right credential, then unpublish the workflow and publish it again (on n8n 1, deactivate and reactivate it).',
	),

	// Generic
	missing_part_property: fixed('An attachment is not valid', NODE_BUG),
	not_an_array: fixed('Bi-way received a malformed request', NODE_BUG),
	wrong_parameters_count: fixed('Bi-way received a malformed request', NODE_BUG),
	no_request: fixed('Bi-way received an empty request', NODE_BUG),
	server_error: fixed(
		'The Bi-way server is unavailable',
		`Try again in a few minutes. If Bi-way is still unavailable, contact Bi-way support (${SUPPORT_EMAIL}).`,
	),
};

/**
 * The French server message often quotes the faulty value: 'Le canal 'rcs' est inconnu.'
 */
function quotedDetail(serverMessage: string): string {
	const quoted = serverMessage.match(/'([^']+)'/);
	if (quoted) {
		return quoted[1];
	}
	// 'La valeur de la colonne Téléphone est incorrecte…'
	const column = serverMessage.match(/colonne (.+?) est /);
	return column ? `'${column[1]}'` : '';
}

export function describeBiwayError(code: string, serverMessage: string): BiwayErrorDescription {
	const builder = ERRORS[code];
	if (builder) {
		return builder(quotedDetail(serverMessage), serverMessage);
	}
	return {
		message: code ? `Bi-way refused the request (${code})` : 'Bi-way refused the request',
		description: serverMessage ? `Bi-way answered (in French): ${serverMessage}` : '',
	};
}
