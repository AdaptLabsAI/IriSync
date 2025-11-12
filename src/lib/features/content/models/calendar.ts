import { Timestamp } from 'firebase/firestore';
import { PlatformType } from '../../platforms';

/**
 * Represents a specific date on the calendar
 */
export interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isPast: boolean;
  isHoliday?: boolean;
  holidayName?: string;
  events: CalendarEvent[];
}

/**
 * Represents a week structure in the calendar
 */
export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDate[];
  totalEvents: number;
}

/**
 * Represents a month structure in the calendar
 */
export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  name: string;
  weeks: CalendarWeek[];
  totalEvents: number;
}

/**
 * Types of calendar events
 */
export enum CalendarEventType {
  CONTENT = 'content',
  REMINDER = 'reminder',
  MEETING = 'meeting',
  DEADLINE = 'deadline',
  PERSONAL = 'personal',
  OTHER = 'other'
}

/**
 * Status of calendar events
 */
export enum CalendarEventStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  FAILED = 'failed'
}

/**
 * Calendar event recurrence types
 */
export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

/**
 * Days of the week constants for recurrence
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

/**
 * Recurrence pattern for calendar events
 */
export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // Every X days/weeks/months/years
  dayOfWeek?: DayOfWeek[]; // For weekly recurrence
  dayOfMonth?: number; // For monthly recurrence
  monthOfYear?: number; // For yearly recurrence
  endDate?: Date; // Optional end date
  occurrences?: number; // Optional number of occurrences
  daysOfMonth?: number[]; // For monthly recurrence with multiple days
  weekOfMonth?: number; // For monthly recurrence (1st, 2nd, 3rd, 4th, -1 for last)
  excludeDates?: Date[]; // Dates to exclude from the pattern
  excludeWeekends?: boolean; // Whether to skip weekends
  rrule?: string; // RFC 5545 RRULE string for complex recurrence
}

/**
 * Main calendar event interface
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  start: Date | Timestamp;
  end?: Date | Timestamp;
  allDay: boolean;
  location?: string;
  url?: string;
  color?: string;
  icon?: string;
  status: CalendarEventStatus;
  userId: string;
  organizationId?: string;
  teamId?: string;
  contentId?: string;
  platformTypes?: PlatformType[];
  isRecurring: boolean;
  recurrence?: RecurrencePattern;
  recurringEventId?: string; // Parent ID for recurring instances
  isMaster?: boolean; // Whether this is the master recurring event
  tags?: string[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Calendar view filters
 */
export interface CalendarFilter {
  startDate: Date;
  endDate: Date;
  eventTypes?: CalendarEventType[];
  eventStatuses?: CalendarEventStatus[];
  platforms?: PlatformType[];
  tags?: string[];
  users?: string[];
  showRecurring?: boolean;
  searchQuery?: string;
}

/**
 * Options for generating calendar data
 */
export interface CalendarOptions {
  timezone?: string;
  firstDayOfWeek?: DayOfWeek;
  includeHolidays?: boolean;
  markWeekends?: boolean;
  showPastEvents?: boolean;
}

/**
 * Calendar time slot
 */
export interface CalendarTimeSlot {
  time: string; // Format: "HH:MM"
  hour: number;
  minute: number;
  events: CalendarEvent[];
  isCurrentHour: boolean;
}

/**
 * Calendar day view with hourly slots
 */
export interface CalendarDayView {
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  timeSlots: CalendarTimeSlot[];
  allDayEvents: CalendarEvent[];
}

/**
 * Weekly calendar view
 */
export interface CalendarWeekView {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  days: CalendarDayView[];
}

/**
 * Monthly calendar view
 */
export interface CalendarMonthView {
  year: number;
  month: number;
  name: string;
  weeks: CalendarWeek[];
}

/**
 * Utility functions for calendar operations
 */
export const CalendarUtils = {
  /**
   * Checks if a date is a weekend
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  },
  
  /**
   * Checks if a date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  },
  
  /**
   * Checks if a date is in the past
   */
  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  },
  
  /**
   * Formats a time string (HH:MM)
   */
  formatTime(date: Date, use24Hour: boolean = true): string {
    if (use24Hour) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    
    return `${hour}:${String(minutes).padStart(2, '0')} ${ampm}`;
  },
  
  /**
   * Gets the week number for a date
   */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  },
  
  /**
   * Generates an array of dates for a month
   */
  getDatesInMonth(year: number, month: number, firstDayOfWeek: DayOfWeek = DayOfWeek.SUNDAY): Date[] {
    const dates: Date[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week before the month start
    let start = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek >= firstDayOfWeek ? dayOfWeek - firstDayOfWeek : 7 - (firstDayOfWeek - dayOfWeek);
    start.setDate(firstDay.getDate() - diff);
    
    // End on the last day of the week after the month end
    let end = new Date(lastDay);
    const endDayOfWeek = lastDay.getDay();
    const endDiff = 6 - endDayOfWeek + firstDayOfWeek;
    end.setDate(lastDay.getDate() + (endDiff % 7));
    
    // Generate all dates
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  },
  
  /**
   * Generates time slots for a day
   */
  getTimeSlots(date: Date, intervalMinutes: number = 30): CalendarTimeSlot[] {
    const slots: CalendarTimeSlot[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        slots.push({
          time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          hour,
          minute,
          events: [],
          isCurrentHour: hour === currentHour
        });
      }
    }
    
    return slots;
  },
  
  /**
   * Converts Firestore timestamps to JavaScript dates in calendar events
   */
  normalizeEvent(event: CalendarEvent): CalendarEvent {
    const normalized = { ...event };
    
    if (normalized.start && typeof normalized.start !== 'object') {
      normalized.start = (normalized.start as Timestamp).toDate();
    }
    
    if (normalized.end && typeof normalized.end !== 'object') {
      normalized.end = (normalized.end as Timestamp).toDate();
    }
    
    if (normalized.createdAt && typeof normalized.createdAt !== 'object') {
      normalized.createdAt = (normalized.createdAt as Timestamp).toDate();
    }
    
    if (normalized.updatedAt && typeof normalized.updatedAt !== 'object') {
      normalized.updatedAt = (normalized.updatedAt as Timestamp).toDate();
    }
    
    if (normalized.recurrence?.endDate && typeof normalized.recurrence.endDate !== 'object') {
      normalized.recurrence.endDate = (normalized.recurrence.endDate as any).toDate();
    }
    
    return normalized;
  }
};
