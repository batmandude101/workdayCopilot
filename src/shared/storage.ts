// ============================================================
// WORKDAY COPILOT - Storage Utilities
// Wrapper around chrome.storage.local for type-safe operations
// ============================================================

import {
  UserProfile,
  Settings,
  ApplicationHistoryEntry,
  FillRun,
  STORAGE_KEYS,
} from './types.js';

// -------------------------
// Default Values
// -------------------------

export const DEFAULT_PROFILE: UserProfile = {
  personal: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    linkedInUrl: '',
    portfolioUrl: '',
    githubUrl: '',
  },
  workAuth: {
    authorizedToWork: '',
    requiresSponsorship: '',
    noticePeriod: '',
    willingToRelocate: '',
  },
  lastUpdated: 0,
};

export const DEFAULT_SETTINGS: Settings = {
  overwriteExisting: false,
  previewBeforeFill: false,
};

// -------------------------
// Profile Operations
// -------------------------

export async function getProfile(): Promise<UserProfile> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
  return result[STORAGE_KEYS.PROFILE] || DEFAULT_PROFILE;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  profile.lastUpdated = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE]: profile });
}

// -------------------------
// Settings Operations
// -------------------------

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

// -------------------------
// History Operations
// -------------------------

export async function getHistory(): Promise<ApplicationHistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

export async function addHistoryEntry(entry: ApplicationHistoryEntry): Promise<void> {
  const history = await getHistory();
  history.unshift(entry); // Add to beginning (newest first)
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
}

export async function updateHistoryEntry(
  id: string,
  updates: Partial<ApplicationHistoryEntry>
): Promise<void> {
  const history = await getHistory();
  const index = history.findIndex(entry => entry.id === id);
  if (index !== -1) {
    history[index] = { ...history[index], ...updates };
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(entry => entry.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: filtered });
}

// -------------------------
// Fill Run (Undo Support)
// -------------------------

export async function saveFillRun(fillRun: FillRun): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_FILL_RUN]: fillRun });
}

export async function getLastFillRun(): Promise<FillRun | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_FILL_RUN);
  return result[STORAGE_KEYS.LAST_FILL_RUN] || null;
}

export async function clearLastFillRun(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.LAST_FILL_RUN);
}

// -------------------------
// Export / Import
// -------------------------

export async function exportAllData(): Promise<string> {
  const [profile, settings, history] = await Promise.all([
    getProfile(),
    getSettings(),
    getHistory(),
  ]);

  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      profile,
      settings,
      history,
    },
    null,
    2
  );
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
}

// -------------------------
// CSV Export for History
// -------------------------

export function historyToCSV(history: ApplicationHistoryEntry[]): string {
  const headers = [
    'Company',
    'Role',
    'Status',
    'Applied Date',
    'URL',
    'Portal Domain',
    'Notes',
  ];

  const rows = history.map(entry => [
    escapeCsvField(entry.company),
    escapeCsvField(entry.role),
    entry.status,
    new Date(entry.appliedDate).toISOString(),
    entry.url,
    entry.portalDomain,
    escapeCsvField(entry.notes),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// -------------------------
// UUID Generator
// -------------------------

export function generateId(): string {
  return crypto.randomUUID();
}


