import { Timestamp } from 'firebase/firestore';

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FILLED = 'filled',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

/**
 * Job location type enum
 */
export enum JobLocationType {
  REMOTE = 'remote',
  ONSITE = 'onsite',
  HYBRID = 'hybrid'
}

/**
 * Job type enum
 */
export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP'
}

/**
 * Job location interface
 */
export interface JobLocation {
  type: JobLocationType;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
}

/**
 * Job salary range interface
 */
export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
  isVisible: boolean;
}

/**
 * Job benefit interface
 */
export interface JobBenefit {
  title: string;
  description: string;
  iconUrl?: string;
}

/**
 * Job skill interface
 */
export interface JobSkill {
  name: string;
  required: boolean;
}

/**
 * Hiring manager interface
 */
export interface HiringManager {
  name: string;
  title: string;
  image?: string;
  message?: string;
}

/**
 * Question type enum for application forms
 */
export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  DATE = 'date'
}

/**
 * Custom application question interface
 */
export interface ApplicationQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For select, multiselect, checkbox, radio
  maxLength?: number; // For text, textarea
  fileTypes?: string[]; // For file uploads (e.g., ['pdf', 'doc', 'docx'])
  maxFileSize?: number; // In bytes
}

/**
 * Custom application answer interface
 */
export interface ApplicationAnswer {
  questionId: string;
  value: string | string[] | boolean | null;
  fileUrl?: string; // For file uploads
}

/**
 * Job listing interface
 */
export interface JobListing {
  id: string;
  title: string;
  slug: string;
  department: string;
  jobType: JobType;
  location: JobLocation;
  description: string;
  requirements: string;
  responsibilities: string;
  status: 'draft' | 'published' | 'archived' | 'filled' | 'expired';
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  publishedAt: Date | Timestamp | null;
  expiresAt: Date | Timestamp | null;
  featured: boolean;
  salaryRange: SalaryRange;
  benefits: JobBenefit[];
  skills: JobSkill[];
  hiringManager?: HiringManager;
  teamSize?: number;
  teamDescription?: string;
  applicationQuestions?: ApplicationQuestion[]; // Custom application questions
  applicationInstructions?: string; // Additional instructions for applicants
  applicationDeadline?: Date | Timestamp | null; // Deadline for applications
  applicationNotificationEmail?: string; // Email to notify of new applications
  createdBy?: string; // User ID who created the job listing
}

/**
 * Job application status enum
 */
export enum JobApplicationStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  INTERVIEWING = 'interviewing',
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

/**
 * Job application interface
 */
export interface JobApplication {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  message?: string;
  status: JobApplicationStatus | string;
  notes?: string;
  tags?: string[];
  rating?: number;
  answers?: ApplicationAnswer[]; // Answers to custom application questions
  interviewFeedback?: string;
  rejectionReason?: string;
  customFields?: Record<string, any>; // For any additional fields
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  reviewedAt?: Date | Timestamp;
  reviewedBy?: string;
  interviewScheduled?: Date | Timestamp;
} 