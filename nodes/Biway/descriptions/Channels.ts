import type { DisplayCondition } from 'n8n-workflow';

/**
 * Conditions on the channel name, for display options. Bi-Way names its RCS channels after "rcs"
 * and its email channels after "email" (email, email_smtp); the other channels are SMS.
 */
export const RCS_CHANNELS: DisplayCondition[] = [{ _cnd: { includes: 'rcs' } }];
export const EMAIL_CHANNELS: DisplayCondition[] = [{ _cnd: { includes: 'email' } }];

/** Channels that show cards and carousels: RCS and email. */
export const RICH_CHANNELS: DisplayCondition[] = [...RCS_CHANNELS, ...EMAIL_CHANNELS];

/**
 * A channel given as an expression. n8n shows a field as soon as one of its `show` conditions names
 * an expression, without checking the conditions after it, nor its `hide` conditions. Hence the
 * channel comes last in every `show`, and a field whose `show` does not name the channel uses this
 * condition to hide itself when the channel is an expression.
 */
export const CHANNEL_EXPRESSION: DisplayCondition[] = [{ _cnd: { startsWith: '=' } }];
