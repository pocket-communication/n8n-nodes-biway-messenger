/**
 * Bi-Way services always answer in French. The node maps the error `code` to an English message
 * and a hint telling the user how to fix the problem.
 */

const SIGNUP_URL = 'https://v3.bi-way.fr/signup';
const API_KEYS_URL = 'https://v3.bi-way.fr/settings/security';
const RCS_DECLARATION_URL = 'https://app.bi-way.fr/rcs-registration/';
const RCS_SETTINGS_URL = 'https://v3.bi-way.fr/settings/chatbot';
const SUPPORT_EMAIL = 'tech@pocketcommunication.com';

export interface BiwayErrorDescription {
	message: string;
	description: string;
}

type ErrorBuilder = (detail: string) => BiwayErrorDescription;

const NODE_BUG = `This should not happen with this node. Please report it to ${SUPPORT_EMAIL}.`;

const fixed =
	(message: string, description: string): ErrorBuilder =>
	() => ({ message, description });

const ERRORS: Record<string, ErrorBuilder> = {
	// Authentication and account
	unknow_user: fixed(
		'Invalid Bi-Way API key',
		`Check the token and the secret of the credential. Create a new API key in Bi-Way › Settings › Security (${API_KEYS_URL}).`,
	),
	account_disabled: fixed(
		'Your Bi-Way account is disabled',
		`Contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	no_permission: fixed(
		'Your Bi-Way account is not allowed to use this operation',
		'Ask the administrator of your Bi-Way account to grant this permission to your profile.',
	),
	forbidden_action: fixed(
		'You are not allowed to perform this action on Bi-Way',
		'The resource probably belongs to another Bi-Way account.',
	),
	invalid_contract: fixed(
		'No active Bi-Way plan allows sending through the API',
		`Subscribe to a plan (${SIGNUP_URL}) or contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	services_forbidden: fixed(
		'API access is not enabled on your Bi-Way plan',
		`Contact Bi-Way support (${SUPPORT_EMAIL}) to enable web services on your plan.`,
	),

	// Sending
	no_valid_sender: (channel) => ({
		message: `The channel ${channel || 'you selected'} needs a sender`,
		description:
			"Pick a sender in the 'Sender Name or ID' option, or set a default sender for this channel in your Bi-Way account.",
	}),
	no_channel: fixed('No channel selected', 'Select the channel used to send the message.'),
	no_valid_channel: (channel) => ({
		message: `Unknown channel ${channel}`.trim(),
		description: 'Pick a channel from the list: only the channels enabled on your account work.',
	}),
	no_valid_gateway_for_channel: (channel) => ({
		message: `The channel ${channel || 'you selected'} is not available on your account`,
		description: `Pick another channel or contact Bi-Way support (${SUPPORT_EMAIL}).`,
	}),
	receiver_missing: fixed('The recipient is missing', "Fill in the 'Recipient' field."),
	receivers_missing: fixed('The recipients are missing', 'Add at least one recipient.'),
	receiver_error: fixed(
		'The recipient address is not valid for this channel',
		'Use an international phone number (for example +33612345678) for SMS and RCS, or an email address for email channels.',
	),
	no_valid_receivers: fixed(
		'None of the recipients can receive this message',
		'Phone channels need phone numbers and email channels need email addresses. Unsubscribed recipients are skipped.',
	),
	no_valid_receivers_for_channel: (channel) => ({
		message: `None of the recipients can receive messages on ${channel || 'this channel'}`,
		description:
			'Phone channels need phone numbers and email channels need email addresses. Unsubscribed recipients are skipped.',
	}),
	no_valid_date: fixed(
		'The send date is not valid',
		'The date must be in the future. Bi-Way schedules messages in the Europe/Paris time zone, to the minute.',
	),
	message_not_created_for_channel: (channel) => ({
		message: `Bi-Way refused the message for ${channel || 'this channel'}`,
		description: `For RCS, your RCS agent must be declared and launched: check it with RCS › Get Status, or declare it at ${RCS_DECLARATION_URL}.`,
	}),
	asset_not_found: fixed(
		'One of the attachments was not found',
		'Check the asset IDs: they must belong to your Bi-Way gallery (see Asset › Upload).',
	),
	template_not_found: fixed(
		'The message template was not found',
		'Pick a template from the list, or create one with Template › Create.',
	),
	template_asset_id_not_found: fixed(
		'One of the template attachments was not found',
		'Check the asset IDs: they must belong to your Bi-Way gallery.',
	),

	// RCS
	agent_not_found: fixed(
		'Your Bi-Way account has no RCS agent',
		`Declare your RCS agent at ${RCS_DECLARATION_URL} or in your RCS settings (${RCS_SETTINGS_URL}), then check its state with RCS › Get Status.`,
	),
	chat_service_not_allowed: fixed(
		'Your Bi-Way plan does not include RCS',
		`Upgrade your plan (${SIGNUP_URL}) or contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	chatbot_not_owned: fixed(
		'This RCS agent belongs to another Bi-Way account',
		'Use the API key of the account that owns the RCS agent.',
	),
	missing_trigger_attribute: (attribute) => ({
		message: `A field of the keyword reply is missing${attribute ? `: ${attribute}` : ''}`,
		description: 'Fill in the label and the keyword.',
	}),
	trigger_keyword_exists: fixed(
		'This keyword is already used on your account',
		'Choose another keyword. Bi-Way compares keywords in upper case, with spaces and special characters replaced by underscores.',
	),
	unknow_trigger_type: fixed('Unknown keyword reply type', NODE_BUG),
	trigger_rule_invalid: fixed('A rule of the keyword reply is not valid', NODE_BUG),

	// Templates
	missing_template_title: fixed('The template title is missing', "Fill in the 'Title' field."),
	missing_template_format: fixed('The template format is missing', 'Pick a format.'),
	missing_template_body: fixed('The template body is missing', "Fill in the 'Body' field."),
	missing_template_subject: fixed(
		'The template subject is missing',
		'HTML templates need a subject and a body.',
	),
	wrong_template_extra: fixed(
		"The 'Extra (JSON)' field of the template is not valid",
		"Card templates need a 'cards' array in 'Extra (JSON)'. See the Bi-Way API documentation: https://services.bi-way.fr/openapi/.",
	),

	// Gallery
	no_file: fixed('No file was sent', "Check the 'Input Binary Field' name."),
	file_transfert_error: fixed(
		'The file could not be transferred to Bi-Way',
		'Try again. If the file is still refused, check its size and its type.',
	),
	mime_type_missing: fixed(
		'The type of the file is unknown',
		'Make sure the binary data has a MIME type.',
	),
	unsupported_mime_type: fixed(
		'This type of file is not supported by the Bi-Way gallery',
		'Upload an image, a video or a document.',
	),
	asset_type_forbidden: fixed('This type of file is not accepted', 'Executable files are refused.'),
	asset_too_large: fixed(
		'The file is too large',
		'Maximum 2 MB for images and documents, 30 MB for videos.',
	),
	not_gallery_account: fixed(
		'This gallery belongs to another Bi-Way account',
		"Remove the 'Gallery ID' option to upload to your default gallery.",
	),

	// Contacts
	no_software_file: fixed('The file format is missing', NODE_BUG),
	unknow_software_file: fixed(
		'Bi-Way could not read this file',
		"Pick the file format (CSV, XLS or XLSX) instead of 'Automatic', and check the columns of the file.",
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
		'Contacts are not enabled on your Bi-Way account',
		`Contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	unknow_entry_type: fixed(
		'Contacts are not enabled on your Bi-Way account',
		`Contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),

	entry_already_exists: fixed(
		'This contact already exists in your Bi-Way account',
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
		'Contacts are not available on your Bi-Way account',
		`Contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	filter_invalid: fixed('Bi-Way refused the contact search', NODE_BUG),
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
	property_name_missing: fixed('Bi-Way received an incomplete request', NODE_BUG),
	property_value_missing: fixed('Bi-Way received an incomplete request', NODE_BUG),

	// Gallery files used in cards
	no_asset: fixed(
		'The gallery file was not found',
		"Pick an image of your Bi-Way gallery, or map the 'id' returned by Asset › Upload.",
	),
	not_asset_owner: fixed(
		'This gallery file belongs to another Bi-Way account',
		'Pick an image of your own gallery.',
	),

	// Callbacks (trigger)
	no_url: fixed(
		'Bi-Way refused the webhook URL',
		'The URL must be public and use HTTPS. When n8n runs behind a proxy or a tunnel, set the WEBHOOK_URL environment variable of n8n.',
	),
	no_event: fixed(
		'Bi-Way does not support this kind of webhook registration yet',
		`Your Bi-Way server is not up to date. Contact Bi-Way support (${SUPPORT_EMAIL}).`,
	),
	event_not_found: fixed('Unknown Bi-Way event', NODE_BUG),
	callback_not_found: fixed(
		'The webhook registration was not found on Bi-Way',
		'Unpublish the workflow and publish it again (on n8n 1, deactivate and reactivate it) to register the webhook again.',
	),
	not_callback_owner: fixed(
		'This webhook registration belongs to another Bi-Way account',
		'Pick the right credential, then unpublish the workflow and publish it again (on n8n 1, deactivate and reactivate it).',
	),

	// Generic
	missing_part_property: fixed('An attachment is not valid', NODE_BUG),
	not_an_array: fixed('Bi-Way received a malformed request', NODE_BUG),
	wrong_parameters_count: fixed('Bi-Way received a malformed request', NODE_BUG),
	no_request: fixed('Bi-Way received an empty request', NODE_BUG),
	server_error: fixed(
		'The Bi-Way server is unavailable',
		`Try again in a few minutes. If Bi-Way is still unavailable, contact Bi-Way support (${SUPPORT_EMAIL}).`,
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
		return builder(quotedDetail(serverMessage));
	}
	return {
		message: code ? `Bi-Way refused the request (${code})` : 'Bi-Way refused the request',
		description: serverMessage ? `Bi-Way answered (in French): ${serverMessage}` : '',
	};
}
