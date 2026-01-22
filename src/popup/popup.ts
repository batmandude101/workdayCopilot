// ============================================================
// WORKDAY COPILOT - Popup Script
// Main popup UI logic
// ============================================================

import {
  UserProfile,
  Settings,
  ApplicationHistoryEntry,
  Message,
  PageContext,
  FillReport,
  PreviewResult,
  ApplicationStatus,
} from '../shared/types.js';

import {
  getProfile,
  saveProfile,
  getSettings,
  saveSettings,
  getHistory,
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  exportAllData,
  clearAllData,
  historyToCSV,
  generateId,
  DEFAULT_PROFILE,
} from '../shared/storage.js';

// ============================================================
// DOM Elements
// ============================================================

// Tabs
const tabs = document.querySelectorAll<HTMLButtonElement>('.tab');
const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

// Status
const statusIndicator = document.getElementById('status-indicator')!;
const statusText = statusIndicator.querySelector('.status-text')!;

// Fill Tab
const workdayNotDetected = document.getElementById('workday-not-detected')!;
const workdayDetected = document.getElementById('workday-detected')!;
const pageCompany = document.getElementById('page-company')!;
const pageRole = document.getElementById('page-role')!;
const btnPreview = document.getElementById('btn-preview') as HTMLButtonElement;
const btnFill = document.getElementById('btn-fill') as HTMLButtonElement;
const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
const fillReport = document.getElementById('fill-report')!;
const statFilled = document.getElementById('stat-filled')!;
const statReview = document.getElementById('stat-review')!;
const statSkipped = document.getElementById('stat-skipped')!;
const reviewList = document.getElementById('review-list')!;
const confirmationPrompt = document.getElementById('confirmation-prompt')!;
const btnMarkApplied = document.getElementById('btn-mark-applied') as HTMLButtonElement;

// Profile Tab
const profileForm = document.getElementById('profile-form') as HTMLFormElement;
const saveStatus = document.getElementById('save-status')!;

// History Tab
const historySearch = document.getElementById('history-search') as HTMLInputElement;
const historyFilter = document.getElementById('history-filter') as HTMLSelectElement;
const historyList = document.getElementById('history-list')!;
const btnExportCsv = document.getElementById('btn-export-csv') as HTMLButtonElement;

// Settings Tab
const settingOverwrite = document.getElementById('setting-overwrite') as HTMLInputElement;
const settingPreview = document.getElementById('setting-preview') as HTMLInputElement;
const btnExportData = document.getElementById('btn-export-data') as HTMLButtonElement;
const btnClearData = document.getElementById('btn-clear-data') as HTMLButtonElement;

// ============================================================
// State
// ============================================================

let currentProfile: UserProfile = DEFAULT_PROFILE;
let currentSettings: Settings = { overwriteExisting: false, previewBeforeFill: false };
let currentHistory: ApplicationHistoryEntry[] = [];
let currentPageContext: PageContext | null = null;
let canUndo = false;

// ============================================================
// Tab Navigation
// ============================================================

function switchTab(tabName: string) {
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-tab`);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    if (tabName) switchTab(tabName);
  });
});

// ============================================================
// Page Context Detection
// ============================================================

async function checkPageContext(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id || !tab.url) {
      showNotWorkday();
      return;
    }

    // Check if on Workday domain
    const isWorkday = tab.url.includes('myworkdayjobs.com');
    
    if (!isWorkday) {
      showNotWorkday();
      return;
    }

    // Get detailed context from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' });
      currentPageContext = response as PageContext;
      showWorkdayReady();
    } catch {
      // Content script might not be loaded yet
      currentPageContext = {
        url: tab.url,
        title: tab.title || '',
        company: extractCompanyFromUrl(tab.url),
        role: extractRoleFromTitle(tab.title || ''),
        isWorkday: true,
        isConfirmationPage: false,
      };
      showWorkdayReady();
    }
  } catch (error) {
    console.error('Error checking page context:', error);
    showNotWorkday();
  }
}

function extractCompanyFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([^.]+)\.myworkdayjobs\.com/);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
  } catch {}
  return 'Unknown Company';
}

function extractRoleFromTitle(title: string): string {
  // Common patterns: "Job Title - Company" or "Company | Job Title"
  const cleaned = title.replace(/\s*[-|]\s*Workday$/i, '').trim();
  return cleaned || 'Job Application';
}

function showNotWorkday(): void {
  statusIndicator.classList.remove('ready');
  statusIndicator.classList.add('not-ready');
  statusText.textContent = 'Not on Workday';
  
  workdayNotDetected.style.display = 'flex';
  workdayDetected.style.display = 'none';
}

function showWorkdayReady(): void {
  statusIndicator.classList.add('ready');
  statusIndicator.classList.remove('not-ready');
  statusText.textContent = 'Ready';
  
  workdayNotDetected.style.display = 'none';
  workdayDetected.style.display = 'flex';
  
  if (currentPageContext) {
    pageCompany.textContent = currentPageContext.company;
    pageRole.textContent = currentPageContext.role;
    
    if (currentPageContext.isConfirmationPage) {
      confirmationPrompt.style.display = 'flex';
    }
  }
}

// ============================================================
// Fill Actions
// ============================================================

async function sendMessageToContentScript(message: Message): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return chrome.tabs.sendMessage(tab.id, message);
}

async function handlePreview(): Promise<void> {
  try {
    btnPreview.disabled = true;
    btnPreview.textContent = 'Scanning...';
    
    const result = await sendMessageToContentScript({ type: 'PREVIEW_FIELDS' }) as PreviewResult;
    
    // Show preview in fill report
    fillReport.style.display = 'block';
    statFilled.textContent = result.totalFound.toString();
    statReview.textContent = '0';
    statSkipped.textContent = '0';
    
    reviewList.innerHTML = result.fields.map(field => `
      <div class="review-item">
        <strong>${field.label}:</strong> ${field.suggestedValue}
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Preview error:', error);
  } finally {
    btnPreview.disabled = false;
    btnPreview.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Preview
    `;
  }
}

async function handleFill(): Promise<void> {
  try {
    btnFill.disabled = true;
    btnFill.textContent = 'Filling...';
    
    const result = await sendMessageToContentScript({
      type: 'FILL_FIELDS',
      overwriteExisting: currentSettings.overwriteExisting,
    }) as FillReport;
    
    // Show fill report
    fillReport.style.display = 'block';
    statFilled.textContent = result.filled.toString();
    statReview.textContent = result.needsReview.toString();
    statSkipped.textContent = result.skipped.toString();
    
    if (result.reviewFields.length > 0) {
      reviewList.innerHTML = result.reviewFields.map(field => `
        <div class="review-item">⚠ ${field.label}: verify this field</div>
      `).join('');
    } else {
      reviewList.innerHTML = '';
    }
    
    // Enable undo
    canUndo = true;
    btnUndo.disabled = false;
    
  } catch (error) {
    console.error('Fill error:', error);
  } finally {
    btnFill.disabled = false;
    btnFill.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Fill Page
    `;
  }
}

async function handleUndo(): Promise<void> {
  try {
    btnUndo.disabled = true;
    await sendMessageToContentScript({ type: 'UNDO_LAST_FILL' });
    canUndo = false;
    fillReport.style.display = 'none';
  } catch (error) {
    console.error('Undo error:', error);
    btnUndo.disabled = !canUndo;
  }
}

async function handleMarkAsApplied(): Promise<void> {
  if (!currentPageContext) return;
  
  const entry: ApplicationHistoryEntry = {
    id: generateId(),
    company: currentPageContext.company,
    role: currentPageContext.role,
    url: currentPageContext.url,
    appliedDate: Date.now(),
    status: 'applied',
    notes: '',
    portalDomain: new URL(currentPageContext.url).hostname,
  };
  
  await addHistoryEntry(entry);
  currentHistory = await getHistory();
  renderHistory();
  
  confirmationPrompt.innerHTML = '<p>✓ Added to history!</p>';
  setTimeout(() => {
    confirmationPrompt.style.display = 'none';
  }, 2000);
}

// Event listeners
btnPreview.addEventListener('click', handlePreview);
btnFill.addEventListener('click', handleFill);
btnUndo.addEventListener('click', handleUndo);
btnMarkApplied.addEventListener('click', handleMarkAsApplied);

// ============================================================
// Profile Form
// ============================================================

function populateProfileForm(profile: UserProfile): void {
  const form = profileForm;
  
  // Personal
  (form.elements.namedItem('firstName') as HTMLInputElement).value = profile.personal.firstName;
  (form.elements.namedItem('lastName') as HTMLInputElement).value = profile.personal.lastName;
  (form.elements.namedItem('email') as HTMLInputElement).value = profile.personal.email;
  (form.elements.namedItem('phone') as HTMLInputElement).value = profile.personal.phone;
  
  // Address
  (form.elements.namedItem('street') as HTMLInputElement).value = profile.personal.address.street;
  (form.elements.namedItem('city') as HTMLInputElement).value = profile.personal.address.city;
  (form.elements.namedItem('state') as HTMLInputElement).value = profile.personal.address.state;
  (form.elements.namedItem('country') as HTMLInputElement).value = profile.personal.address.country;
  (form.elements.namedItem('postalCode') as HTMLInputElement).value = profile.personal.address.postalCode;
  
  // Links
  (form.elements.namedItem('linkedInUrl') as HTMLInputElement).value = profile.personal.linkedInUrl;
  (form.elements.namedItem('portfolioUrl') as HTMLInputElement).value = profile.personal.portfolioUrl;
  (form.elements.namedItem('githubUrl') as HTMLInputElement).value = profile.personal.githubUrl;
  
  // Work Auth
  (form.elements.namedItem('authorizedToWork') as HTMLSelectElement).value = profile.workAuth.authorizedToWork;
  (form.elements.namedItem('requiresSponsorship') as HTMLSelectElement).value = profile.workAuth.requiresSponsorship;
  (form.elements.namedItem('noticePeriod') as HTMLInputElement).value = profile.workAuth.noticePeriod;
  (form.elements.namedItem('willingToRelocate') as HTMLSelectElement).value = profile.workAuth.willingToRelocate;
}

function getProfileFromForm(): UserProfile {
  const form = profileForm;
  
  return {
    personal: {
      firstName: (form.elements.namedItem('firstName') as HTMLInputElement).value,
      lastName: (form.elements.namedItem('lastName') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      address: {
        street: (form.elements.namedItem('street') as HTMLInputElement).value,
        city: (form.elements.namedItem('city') as HTMLInputElement).value,
        state: (form.elements.namedItem('state') as HTMLInputElement).value,
        country: (form.elements.namedItem('country') as HTMLInputElement).value,
        postalCode: (form.elements.namedItem('postalCode') as HTMLInputElement).value,
      },
      linkedInUrl: (form.elements.namedItem('linkedInUrl') as HTMLInputElement).value,
      portfolioUrl: (form.elements.namedItem('portfolioUrl') as HTMLInputElement).value,
      githubUrl: (form.elements.namedItem('githubUrl') as HTMLInputElement).value,
    },
    workAuth: {
      authorizedToWork: (form.elements.namedItem('authorizedToWork') as HTMLSelectElement).value as '' | 'yes' | 'no',
      requiresSponsorship: (form.elements.namedItem('requiresSponsorship') as HTMLSelectElement).value as '' | 'yes' | 'no',
      noticePeriod: (form.elements.namedItem('noticePeriod') as HTMLInputElement).value,
      willingToRelocate: (form.elements.namedItem('willingToRelocate') as HTMLSelectElement).value as '' | 'yes' | 'no',
    },
    lastUpdated: Date.now(),
  };
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const profile = getProfileFromForm();
  await saveProfile(profile);
  currentProfile = profile;
  
  saveStatus.textContent = '✓ Saved!';
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
});

// ============================================================
// History
// ============================================================

function renderHistory(): void {
  const searchTerm = historySearch.value.toLowerCase();
  const statusFilter = historyFilter.value as ApplicationStatus | '';
  
  let filtered = currentHistory;
  
  if (searchTerm) {
    filtered = filtered.filter(entry =>
      entry.company.toLowerCase().includes(searchTerm) ||
      entry.role.toLowerCase().includes(searchTerm)
    );
  }
  
  if (statusFilter) {
    filtered = filtered.filter(entry => entry.status === statusFilter);
  }
  
  if (filtered.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>${searchTerm || statusFilter ? 'No matching applications' : 'No applications tracked yet'}</p>
        <span>Click "Mark as Applied" after submitting an application</span>
      </div>
    `;
    return;
  }
  
  historyList.innerHTML = filtered.map(entry => `
    <div class="history-item" data-id="${entry.id}">
      <div class="history-item-header">
        <div class="history-item-info">
          <span class="history-company">${escapeHtml(entry.company)}</span>
          <span class="history-role">${escapeHtml(entry.role)}</span>
        </div>
        <div class="history-actions">
          <button class="btn-edit-history" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-delete-history" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-meta">
        <span class="status-badge ${entry.status}">${formatStatus(entry.status)}</span>
        <span>${formatDate(entry.appliedDate)}</span>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for edit/delete
  historyList.querySelectorAll('.btn-edit-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.history-item');
      if (item) handleEditHistory(item.getAttribute('data-id')!);
    });
  });
  
  historyList.querySelectorAll('.btn-delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.history-item');
      if (item) handleDeleteHistory(item.getAttribute('data-id')!);
    });
  });
}

function formatStatus(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    applied: 'Applied',
    interviewing: 'Interviewing',
    offered: 'Offered',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    no_response: 'No Response',
  };
  return labels[status];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleEditHistory(id: string): Promise<void> {
  const entry = currentHistory.find(e => e.id === id);
  if (!entry) return;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>Edit Application</h3>
      <div class="form-group">
        <label for="edit-status">Status</label>
        <select id="edit-status">
          <option value="applied" ${entry.status === 'applied' ? 'selected' : ''}>Applied</option>
          <option value="interviewing" ${entry.status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="offered" ${entry.status === 'offered' ? 'selected' : ''}>Offered</option>
          <option value="rejected" ${entry.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          <option value="withdrawn" ${entry.status === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
          <option value="no_response" ${entry.status === 'no_response' ? 'selected' : ''}>No Response</option>
        </select>
      </div>
      <div class="form-group">
        <label for="edit-notes">Notes</label>
        <textarea id="edit-notes" rows="3">${escapeHtml(entry.notes)}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-primary btn-save">Save</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.btn-cancel')!.addEventListener('click', () => modal.remove());
  modal.querySelector('.btn-save')!.addEventListener('click', async () => {
    const newStatus = (modal.querySelector('#edit-status') as HTMLSelectElement).value as ApplicationStatus;
    const newNotes = (modal.querySelector('#edit-notes') as HTMLTextAreaElement).value;
    
    await updateHistoryEntry(id, { status: newStatus, notes: newNotes });
    currentHistory = await getHistory();
    renderHistory();
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function handleDeleteHistory(id: string): Promise<void> {
  if (!confirm('Delete this application from history?')) return;
  
  await deleteHistoryEntry(id);
  currentHistory = await getHistory();
  renderHistory();
}

// Event listeners
historySearch.addEventListener('input', renderHistory);
historyFilter.addEventListener('change', renderHistory);

btnExportCsv.addEventListener('click', async () => {
  const csv = historyToCSV(currentHistory);
  downloadFile(csv, 'workday-applications.csv', 'text/csv');
});

// ============================================================
// Settings
// ============================================================

async function loadSettings(): Promise<void> {
  currentSettings = await getSettings();
  settingOverwrite.checked = currentSettings.overwriteExisting;
  settingPreview.checked = currentSettings.previewBeforeFill;
}

settingOverwrite.addEventListener('change', async () => {
  currentSettings.overwriteExisting = settingOverwrite.checked;
  await saveSettings(currentSettings);
});

settingPreview.addEventListener('change', async () => {
  currentSettings.previewBeforeFill = settingPreview.checked;
  await saveSettings(currentSettings);
});

btnExportData.addEventListener('click', async () => {
  const data = await exportAllData();
  downloadFile(data, 'workday-copilot-backup.json', 'application/json');
});

btnClearData.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) return;
  if (!confirm('Really delete everything? Profile, history, and settings?')) return;
  
  await clearAllData();
  currentProfile = DEFAULT_PROFILE;
  currentHistory = [];
  currentSettings = { overwriteExisting: false, previewBeforeFill: false };
  
  populateProfileForm(currentProfile);
  renderHistory();
  await loadSettings();
});

// ============================================================
// Utilities
// ============================================================

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Initialize
// ============================================================

async function init(): Promise<void> {
  // Load data
  [currentProfile, currentSettings, currentHistory] = await Promise.all([
    getProfile(),
    getSettings(),
    getHistory(),
  ]);
  
  // Populate UI
  populateProfileForm(currentProfile);
  await loadSettings();
  renderHistory();
  
  // Check page context
  await checkPageContext();
}

init();


