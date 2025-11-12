// Export inbox components
export { default as MessageFilterButton } from './MessageFilterButton';
export { default as ReplyButton } from './ReplyButton';
export { default as MarkReadButton } from './MarkReadButton';
export { default as AssignMessageButton } from './AssignMessageButton';
export { default as InboxSearchBar } from './InboxSearchBar';
export { default as ResponseTemplateButton } from './ResponseTemplateButton';
export { default as ThreadViewButton } from './ThreadViewButton';
export { default as PlatformFilterToggle } from './PlatformFilterToggle';
export { default as MessageCard } from './MessageCard';

// Export new components
export { default as MessageList } from './MessageList';
export { default as InboxFilters } from './InboxFilters';
export { default as InboxStats } from './InboxStats';

// Export types
export type { 
  MessageFilterButtonProps, 
  MessageFilter, 
  MessageStatus, 
  MessageType, 
  PlatformOption,
  UserOption
} from './MessageFilterButton';

export type {
  ReplyButtonProps,
  MessageInfo,
  ResponseTemplate as ReplyTemplate
} from './ReplyButton';

export type {
  MarkReadButtonProps
} from './MarkReadButton';

export type {
  AssignMessageButtonProps,
  TeamMember
} from './AssignMessageButton';

export type {
  InboxSearchBarProps,
  SearchQuery,
  SearchResult
} from './InboxSearchBar';

export type {
  ResponseTemplateButtonProps,
  ResponseTemplate
} from './ResponseTemplateButton';

export type {
  ThreadViewButtonProps,
  ThreadViewMode
} from './ThreadViewButton';

export type {
  PlatformFilterToggleProps,
  SocialPlatform
} from './PlatformFilterToggle';

export type {
  MessageCardProps,
  Message,
  Author,
  MessageAttachment,
  MessagePriority
} from './MessageCard';

// Export new component types
export type { MessageListProps } from './MessageList';
export type { InboxFiltersProps } from './InboxFilters';
export type { InboxStatsProps } from './InboxStats';

// Mobile-specific components
export { MobileInboxHeader } from './MobileInboxHeader';
export { MobileMessageCard } from './MobileMessageCard';
export { MobileReplyModal } from './MobileReplyModal';
export { MobileFilterDrawer } from './MobileFilterDrawer';
export type { FilterOptions } from './MobileFilterDrawer'; 