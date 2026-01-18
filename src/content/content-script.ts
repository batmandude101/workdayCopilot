// ============================================================
// WORKDAY COPILOT - Content Script
// Field detection, matching, filling, and undo functionality
// ============================================================

import {
  UserProfile,
  MatchedField,
  FillRun,
  TouchedField,
  PageContext,
  FillReport,
  PreviewResult,
  ConfidenceLevel,
  Message,
} from '../shared/types.js';

import {
  FIELD_MAPPINGS,
  normalizeText,
  getProfileValue,
  YES_PATTERNS,
  NO_PATTERNS,
} from '../shared/field-mappings.js';

import {
  getProfile,
  saveFillRun,
  getLastFillRun,
  clearLastFillRun,
  generateId,
} from '../shared/storage.js';

// ============================================================
// Constants
// ============================================================

const HIGHLIGHT_CLASS_FILLED = 'wdc-filled';
const HIGHLIGHT_CLASS_REVIEW = 'wdc-review';
const CONFIRMATION_PATTERNS = [
  'thank you for applying',
  'application submitted',
  'application received',
  'successfully submitted',
  'we received your application',
  'thanks for your interest',
  'application complete',
];

// ============================================================
// Field Scanner
// ============================================================

interface ScannedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  labelText: string;
  ariaLabel: string;
  name: string;
  id: string;
  placeholder: string;
  type: string;
  currentValue: string;
}

function scanFormFields(): ScannedField[] {
  const fields: ScannedField[] = [];
  
  // Find all input fields
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], ' +
    'input:not([type]), textarea, select'
  );
  
  inputs.forEach(element => {
    // Skip hidden, disabled, or readonly fields
    if (
      element.type === 'hidden' ||
      element.disabled ||
      element.readOnly ||
      !isVisible(element)
    ) {
      return;
    }
    
    const labelText = findLabelText(element);
    
    fields.push({
      element,
      labelText,
      ariaLabel: element.getAttribute('aria-label') || '',
      name: element.name || '',
      id: element.id || '',
      placeholder: element.placeholder || '',
      type: element.type || 'text',
      currentValue: element.value || '',
    });
  });
  
  return fields;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
}

function findLabelText(element: HTMLElement): string {
  // Method 1: Associated label via for/id
  if (element.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  
  // Method 2: Parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // Get text content excluding the input itself
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, textarea, select').forEach(el => el.remove());
    return clone.textContent?.trim() || '';
  }
  
  // Method 3: aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent?.trim() || '';
  }
  
  // Method 4: Previous sibling or parent's previous sibling
  let prev = element.previousElementSibling;
  if (!prev) {
    prev = element.parentElement?.previousElementSibling || null;
  }
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV')) {
    return prev.textContent?.trim() || '';
  }
  
  // Method 5: Data attributes commonly used by Workday
  const dataLabel = element.getAttribute('data-automation-id') || 
                    element.getAttribute('data-uxi-widget-type');
  if (dataLabel) return dataLabel;
  
  return '';
}

// ============================================================
// Field Matching
// ============================================================

function matchFieldToProfile(field: ScannedField, profile: UserProfile): MatchedField | null {
  // Combine all possible label sources
  const labelSources = [
    field.labelText,
    field.ariaLabel,
    field.name,
    field.id,
    field.placeholder,
  ].filter(Boolean);
  
  const normalizedLabels = labelSources.map(normalizeText);
  
  // Try to match against our field mappings
  for (const mapping of FIELD_MAPPINGS) {
    // Check if input type is compatible
    const inputType = field.type.toLowerCase();
    if (!mapping.inputTypes.some(t => 
      t === inputType || 
      (t === 'text' && !['email', 'tel', 'url'].includes(inputType))
    )) {
      continue;
    }
    
    // Check for matches
    let confidence: ConfidenceLevel = 'none';
    
    for (const normalized of normalizedLabels) {
      for (const synonym of mapping.synonyms) {
        if (normalized === synonym) {
          // Exact match
          confidence = 'high';
          break;
        } else if (normalized.includes(synonym) || synonym.includes(normalized)) {
          // Partial match
          if (confidence === 'none') confidence = 'medium';
        }
      }
      if (confidence === 'high') break;
    }
    
    if (confidence !== 'none') {
      const suggestedValue = getProfileValue(profile as unknown as Record<string, unknown>, mapping.profileKey);
      
      // Skip if no value in profile
      if (!suggestedValue) continue;
      
      return {
        element: field.element,
        selectorHint: generateSelectorHint(field.element),
        profileKey: mapping.profileKey,
        confidence,
        currentValue: field.currentValue,
        suggestedValue,
        labelText: field.labelText || field.ariaLabel || field.name || mapping.profileKey,
      };
    }
  }
  
  return null;
}

function generateSelectorHint(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.getAttribute('name')) return `[name="${element.getAttribute('name')}"]`;
  if (element.getAttribute('data-automation-id')) {
    return `[data-automation-id="${element.getAttribute('data-automation-id')}"]`;
  }
  
  // Fallback: generate a path-based selector
  const path: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    path.unshift(selector);
    current = parent;
  }
  return path.join(' > ');
}

// ============================================================
// Fill Logic
// ============================================================

function fillField(
  field: MatchedField,
  overwriteExisting: boolean
): TouchedField | null {
  const element = field.element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  
  // Check if should fill
  if (!overwriteExisting && field.currentValue) {
    return null;
  }
  
  const previousValue = element.value;
  
  // Set the value
  element.value = field.suggestedValue;
  
  // Dispatch events to trigger React/Angular form updates
  dispatchInputEvents(element);
  
  // Add visual highlight
  element.classList.add(
    field.confidence === 'high' ? HIGHLIGHT_CLASS_FILLED : HIGHLIGHT_CLASS_REVIEW
  );
  
  return {
    selectorHint: field.selectorHint,
    previousValue,
    newValue: field.suggestedValue,
    profileKey: field.profileKey,
    confidence: field.confidence,
  };
}

function dispatchInputEvents(element: HTMLElement): void {
  // Create and dispatch events
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  const blurEvent = new FocusEvent('blur', { bubbles: true, cancelable: true });
  
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  element.dispatchEvent(blurEvent);
  
  // Also try React's synthetic event trigger
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeInputValueSetter && element instanceof HTMLInputElement) {
    const currentValue = element.value;
    nativeInputValueSetter.call(element, currentValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ============================================================
// Undo Logic
// ============================================================

async function undoLastFill(): Promise<boolean> {
  const lastRun = await getLastFillRun();
  if (!lastRun) return false;
  
  let restoredCount = 0;
  
  for (const field of lastRun.touchedFields) {
    try {
      const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        field.selectorHint
      );
      
      if (element) {
        element.value = field.previousValue;
        dispatchInputEvents(element);
        element.classList.remove(HIGHLIGHT_CLASS_FILLED, HIGHLIGHT_CLASS_REVIEW);
        restoredCount++;
      }
    } catch (error) {
      console.warn('Failed to restore field:', field.selectorHint, error);
    }
  }
  
  await clearLastFillRun();
  return restoredCount > 0;
}

// ============================================================
// Page Context Detection
// ============================================================

function detectPageContext(): PageContext {
  const url = window.location.href;
  const title = document.title;
  
  // Extract company from URL
  let company = 'Unknown Company';
  const hostnameMatch = window.location.hostname.match(/^([^.]+)\.myworkdayjobs\.com/);
  if (hostnameMatch) {
    company = hostnameMatch[1].charAt(0).toUpperCase() + hostnameMatch[1].slice(1);
  }
  
  // Extract role from title
  let role = 'Job Application';
  const titleParts = title.split(/[-|]/);
  if (titleParts.length > 0) {
    role = titleParts[0].trim();
  }
  
  // Check for confirmation page
  const isConfirmationPage = checkIfConfirmationPage();
  
  return {
    url,
    title,
    company,
    role,
    isWorkday: true,
    isConfirmationPage,
  };
}

function checkIfConfirmationPage(): boolean {
  // Check URL patterns
  const urlPatterns = ['/confirmation', '/applied', '/thankyou', '/thank-you', '/success'];
  if (urlPatterns.some(pattern => window.location.href.toLowerCase().includes(pattern))) {
    return true;
  }
  
  // Check page content
  const bodyText = document.body.innerText.toLowerCase();
  return CONFIRMATION_PATTERNS.some(pattern => bodyText.includes(pattern));
}

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'GET_PAGE_CONTEXT':
      return detectPageContext();
    
    case 'PREVIEW_FIELDS':
      return handlePreview();
    
    case 'FILL_FIELDS':
      return handleFill(message.overwriteExisting);
    
    case 'UNDO_LAST_FILL':
      return handleUndo();
    
    case 'CHECK_CONFIRMATION':
      return { isConfirmation: checkIfConfirmationPage() };
    
    default:
      return { error: 'Unknown message type' };
  }
}

async function handlePreview(): Promise<PreviewResult> {
  const profile = await getProfile();
  const scannedFields = scanFormFields();
  
  const matchedFields: MatchedField[] = [];
  
  for (const field of scannedFields) {
    const match = matchFieldToProfile(field, profile);
    if (match) {
      matchedFields.push(match);
      
      // Add temporary highlight
      match.element.classList.add(HIGHLIGHT_CLASS_REVIEW);
    }
  }
  
  // Remove highlights after 3 seconds
  setTimeout(() => {
    matchedFields.forEach(field => {
      field.element.classList.remove(HIGHLIGHT_CLASS_REVIEW);
    });
  }, 3000);
  
  return {
    fields: matchedFields.map(f => ({
      label: f.labelText,
      profileKey: f.profileKey,
      suggestedValue: f.suggestedValue,
      confidence: f.confidence,
    })),
    totalFound: matchedFields.length,
  };
}

async function handleFill(overwriteExisting: boolean): Promise<FillReport> {
  const profile = await getProfile();
  const scannedFields = scanFormFields();
  
  const touchedFields: TouchedField[] = [];
  const reviewFields: Array<{ label: string; profileKey: string; confidence: ConfidenceLevel }> = [];
  let skipped = 0;
  
  for (const field of scannedFields) {
    const match = matchFieldToProfile(field, profile);
    
    if (!match) {
      skipped++;
      continue;
    }
    
    const touched = fillField(match, overwriteExisting);
    
    if (touched) {
      touchedFields.push(touched);
      
      if (match.confidence === 'medium') {
        reviewFields.push({
          label: match.labelText,
          profileKey: match.profileKey,
          confidence: match.confidence,
        });
      }
    } else {
      skipped++;
    }
  }
  
  // Save fill run for undo
  if (touchedFields.length > 0) {
    const fillRun: FillRun = {
      runId: generateId(),
      timestamp: Date.now(),
      url: window.location.href,
      touchedFields,
    };
    await saveFillRun(fillRun);
  }
  
  return {
    filled: touchedFields.filter(f => f.confidence === 'high').length,
    needsReview: reviewFields.length,
    skipped,
    reviewFields,
  };
}

async function handleUndo(): Promise<{ success: boolean }> {
  const success = await undoLastFill();
  return { success };
}

// ============================================================
// Inject Styles
// ============================================================

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .${HIGHLIGHT_CLASS_FILLED} {
      outline: 2px solid #10b981 !important;
      background-color: rgba(16, 185, 129, 0.1) !important;
      transition: all 0.2s ease !important;
    }
    
    .${HIGHLIGHT_CLASS_REVIEW} {
      outline: 2px solid #f59e0b !important;
      background-color: rgba(245, 158, 11, 0.1) !important;
      transition: all 0.2s ease !important;
    }
  `;
  document.head.appendChild(style);
}

// Initialize
injectStyles();
console.log('Workday Copilot: Content script loaded');

