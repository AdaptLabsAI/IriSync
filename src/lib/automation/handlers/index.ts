import { registerTriggerHandler, registerActionHandler } from '../registry';
import { TriggerType, ActionType } from '../models';

// Import trigger handlers
import ContentCreatedTrigger from './triggers/content-created';
import ContentPublishedTrigger from './triggers/content-published';
import MentionReceivedTrigger from './triggers/mention-received';
import ScheduledTimeTrigger from './triggers/scheduled-time';

// Import action handlers
import SendEmailAction from './actions/send-email';
import SendNotificationAction from './actions/send-notification';
import GenerateContentAction from './actions/generate-content';
import AnalyzeSentimentAction from './actions/analyze-sentiment';

// Register trigger handlers
registerTriggerHandler(TriggerType.CONTENT_CREATED, new ContentCreatedTrigger());
registerTriggerHandler(TriggerType.CONTENT_PUBLISHED, new ContentPublishedTrigger());
registerTriggerHandler(TriggerType.MENTION_RECEIVED, new MentionReceivedTrigger());
registerTriggerHandler(TriggerType.SCHEDULED_TIME, new ScheduledTimeTrigger());

// Register action handlers
registerActionHandler(ActionType.SEND_EMAIL, new SendEmailAction());
registerActionHandler(ActionType.SEND_NOTIFICATION, new SendNotificationAction());
registerActionHandler(ActionType.GENERATE_CONTENT, new GenerateContentAction());
registerActionHandler(ActionType.ANALYZE_SENTIMENT, new AnalyzeSentimentAction());

// Export all handlers
export * from './triggers/content-created';
export * from './triggers/content-published';
export * from './triggers/mention-received';
export * from './triggers/scheduled-time';

export * from './actions/send-email';
export * from './actions/send-notification';
export * from './actions/generate-content';
export * from './actions/analyze-sentiment'; 