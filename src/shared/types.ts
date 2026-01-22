// ============================================================
// WORKDAY COPILOT - Core Type Definitions
// ============================================================

// -------------------------
// Profile Types
// -------------------------

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  linkedInUrl: string;
  portfolioUrl: string;
  githubUrl: string;
}

export interface WorkAuthorization {
  authorizedToWork: 'yes' | 'no' | '';
  requiresSponsorship: 'yes' | 'no' | '';
  noticePeriod: string;
  willingToRelocate: 'yes' | 'no' | '';
}

export interface UserProfile {
  personal: PersonalInfo;
  workAuth: WorkAuthorization;
  lastUpdated: number; // timestamp
}

// -------------------------
// Field Matching Types
// -------------------------

export type ConfidenceLevel = 'high' | 'medium' | 'none';

export interface MatchedField {
  element: HTMLElement;
  selectorHint: string; // CSS selector or unique identifier for undo
  profileKey: string; // e.g., "personal.firstName"
  confidence: ConfidenceLevel;
  currentValue: string;
  suggestedValue: string;
  labelText: string;
}

export interface FieldScanResult {
  matched: MatchedField[];
  needsReview: MatchedField[];
  skipped: number;
}

// -------------------------
// Fill Run Types (Undo Support)
// -------------------------

export interface TouchedField {
  selectorHint: string;
  previousValue: string;
  newValue: string;
  profileKey: string;
  confidence: ConfidenceLevel;
}

export interface FillRun {
  runId: string;
  timestamp: number;
  url: string;
  touchedFields: TouchedField[];
}

// -------------------------
// Application History Types
// -------------------------

export type ApplicationStatus = 
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'
  | 'no_response';

export interface ApplicationHistoryEntry {
  id: string;
  company: string;
  role: string;
  url: string;
  appliedDate: number; // timestamp
  status: ApplicationStatus;
  notes: string;
  portalDomain: string;
}

// -------------------------
// Settings Types
// -------------------------

export interface Settings {
  overwriteExisting: boolean;
  previewBeforeFill: boolean;
}

// -------------------------
// Message Types (Popup <-> Content Script)
// -------------------------

export type MessageType =
  | 'PREVIEW_FIELDS'
  | 'FILL_FIELDS'
  | 'UNDO_LAST_FILL'
  | 'GET_PAGE_CONTEXT'
  | 'MARK_AS_APPLIED'
  | 'CHECK_CONFIRMATION';

export interface BaseMessage {
  type: MessageType;
}

export interface PreviewFieldsMessage extends BaseMessage {
  type: 'PREVIEW_FIELDS';
}

export interface FillFieldsMessage extends BaseMessage {
  type: 'FILL_FIELDS';
  overwriteExisting: boolean;
}

export interface UndoLastFillMessage extends BaseMessage {
  type: 'UNDO_LAST_FILL';
}

export interface GetPageContextMessage extends BaseMessage {
  type: 'GET_PAGE_CONTEXT';
}

export interface MarkAsAppliedMessage extends BaseMessage {
  type: 'MARK_AS_APPLIED';
}

export interface CheckConfirmationMessage extends BaseMessage {
  type: 'CHECK_CONFIRMATION';
}

export type Message =
  | PreviewFieldsMessage
  | FillFieldsMessage
  | UndoLastFillMessage
  | GetPageContextMessage
  | MarkAsAppliedMessage
  | CheckConfirmationMessage;

// -------------------------
// Response Types
// -------------------------

export interface PageContext {
  url: string;
  title: string;
  company: string;
  role: string;
  isWorkday: boolean;
  isConfirmationPage: boolean;
}

export interface FillReport {
  filled: number;
  needsReview: number;
  skipped: number;
  reviewFields: Array<{
    label: string;
    profileKey: string;
    confidence: ConfidenceLevel;
  }>;
}

export interface PreviewResult {
  fields: Array<{
    label: string;
    profileKey: string;
    suggestedValue: string;
    confidence: ConfidenceLevel;
  }>;
  totalFound: number;
}

// -------------------------
// Storage Keys
// -------------------------

export const STORAGE_KEYS = {
  PROFILE: 'workday_copilot_profile',
  SETTINGS: 'workday_copilot_settings',
  HISTORY: 'workday_copilot_history',
  LAST_FILL_RUN: 'workday_copilot_last_fill',
} as const;


