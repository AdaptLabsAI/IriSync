// Content Services
export { default as calendarService } from './CalendarService';
export * from './CalendarService';

export { default as bulkSchedulingService } from './BulkSchedulingService';
export * from './BulkSchedulingService';

export { default as workflowService } from './workflow/WorkflowService';
export * from './workflow/WorkflowService';

export { default as socialInboxService } from './SocialInboxService';
export * from './SocialInboxService';

export { default as contentVersionService } from './ContentVersionService';
export * from './ContentVersionService';

export { default as customUrlService } from './CustomUrlService';
export * from './CustomUrlService';

export { default as forumService } from './ForumService';
export * from './ForumService';

// Social Inbox Adapters
export * from './TwitterSocialInboxAdapter';
export * from './LinkedInSocialInboxAdapter';
export * from './FacebookSocialInboxAdapter';
export * from './SocialInboxController';

// Content Models
export * from './models/post';
// export * from './models/media'; // Conflicts with SocialInboxService exports
export * from './models/contentService';
export * from './models/workflow';

// Export media models with proper namespace to avoid conflicts with SocialInboxService
export * as MediaModels from './models/media';

// Content Utilities

/**
 * Format a date for calendar display
 */
export function formatCalendarDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  return date.toLocaleDateString(undefined, options || defaultOptions);
}

/**
 * Format a time for calendar display
 */
export function formatCalendarTime(date: Date, use24Hour: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: !use24Hour
  };

  return date.toLocaleTimeString(undefined, options);
}

/**
 * Format a date and time for calendar display
 */
export function formatCalendarDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  };

  return date.toLocaleString(undefined, options || defaultOptions);
}

/**
 * Get the month name
 */
export function getMonthName(month: number, short: boolean = false): string {
  const date = new Date();
  date.setMonth(month);
  
  return date.toLocaleString(undefined, {
    month: short ? 'short' : 'long'
  });
}

/**
 * Get the day name
 */
export function getDayName(day: number, short: boolean = false): string {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay() + day);
  
  return date.toLocaleString(undefined, {
    weekday: short ? 'short' : 'long'
  });
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the first day of the month
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is between two other dates
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Add years to a date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}
