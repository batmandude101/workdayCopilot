// ============================================================
// WORKDAY COPILOT - Field Mapping Dictionary
// The core matching engine that maps profile keys to form labels
// ============================================================

export interface FieldMapping {
  profileKey: string;
  synonyms: string[];
  inputTypes: string[]; // 'text', 'email', 'tel', 'select', 'radio', 'textarea'
  priority: number; // Higher = more important to fill
}

// Normalized synonyms (lowercase, no punctuation)
export const FIELD_MAPPINGS: FieldMapping[] = [
  // -------------------------
  // Personal Information
  // -------------------------
  {
    profileKey: 'personal.firstName',
    synonyms: [
      'first name',
      'firstname',
      'given name',
      'givenname',
      'legal first name',
      'forename',
      'first',
    ],
    inputTypes: ['text'],
    priority: 100,
  },
  {
    profileKey: 'personal.lastName',
    synonyms: [
      'last name',
      'lastname',
      'surname',
      'family name',
      'familyname',
      'legal last name',
      'last',
    ],
    inputTypes: ['text'],
    priority: 100,
  },
  {
    profileKey: 'personal.email',
    synonyms: [
      'email',
      'email address',
      'e-mail',
      'emailaddress',
      'work email',
      'personal email',
      'contact email',
    ],
    inputTypes: ['email', 'text'],
    priority: 100,
  },
  {
    profileKey: 'personal.phone',
    synonyms: [
      'phone',
      'phone number',
      'phonenumber',
      'telephone',
      'tel',
      'mobile',
      'mobile number',
      'cell',
      'cell phone',
      'contact number',
      'primary phone',
    ],
    inputTypes: ['tel', 'text'],
    priority: 95,
  },

  // -------------------------
  // Address Fields
  // -------------------------
  {
    profileKey: 'personal.address.street',
    synonyms: [
      'street',
      'street address',
      'address',
      'address line 1',
      'address1',
      'addressline1',
      'street line 1',
      'home address',
      'residential address',
    ],
    inputTypes: ['text', 'textarea'],
    priority: 80,
  },
  {
    profileKey: 'personal.address.city',
    synonyms: [
      'city',
      'town',
      'municipality',
      'city/town',
    ],
    inputTypes: ['text'],
    priority: 80,
  },
  {
    profileKey: 'personal.address.state',
    synonyms: [
      'state',
      'province',
      'state/province',
      'region',
      'state province',
      'state/region',
    ],
    inputTypes: ['text', 'select'],
    priority: 80,
  },
  {
    profileKey: 'personal.address.country',
    synonyms: [
      'country',
      'country/region',
      'nation',
      'country of residence',
    ],
    inputTypes: ['text', 'select'],
    priority: 80,
  },
  {
    profileKey: 'personal.address.postalCode',
    synonyms: [
      'postal code',
      'postalcode',
      'zip',
      'zip code',
      'zipcode',
      'pincode',
      'pin code',
      'postcode',
      'post code',
    ],
    inputTypes: ['text'],
    priority: 80,
  },

  // -------------------------
  // Links / URLs
  // -------------------------
  {
    profileKey: 'personal.linkedInUrl',
    synonyms: [
      'linkedin',
      'linkedin url',
      'linkedin profile',
      'linkedin link',
      'linkedin address',
    ],
    inputTypes: ['text', 'url'],
    priority: 70,
  },
  {
    profileKey: 'personal.portfolioUrl',
    synonyms: [
      'portfolio',
      'portfolio url',
      'portfolio link',
      'website',
      'personal website',
      'personal site',
    ],
    inputTypes: ['text', 'url'],
    priority: 60,
  },
  {
    profileKey: 'personal.githubUrl',
    synonyms: [
      'github',
      'github url',
      'github profile',
      'github link',
    ],
    inputTypes: ['text', 'url'],
    priority: 60,
  },

  // -------------------------
  // Work Authorization
  // -------------------------
  {
    profileKey: 'workAuth.authorizedToWork',
    synonyms: [
      'authorized to work',
      'authorizedtowork',
      'work authorization',
      'legally authorized',
      'eligible to work',
      'right to work',
      'legally eligible to work',
      'authorized to work in',
      'lawfully authorized',
    ],
    inputTypes: ['radio', 'select'],
    priority: 90,
  },
  {
    profileKey: 'workAuth.requiresSponsorship',
    synonyms: [
      'sponsorship',
      'require sponsorship',
      'requires sponsorship',
      'visa sponsorship',
      'need sponsorship',
      'require visa',
      'immigration sponsorship',
      'work visa',
      'will you now or in the future require sponsorship',
    ],
    inputTypes: ['radio', 'select'],
    priority: 90,
  },
  {
    profileKey: 'workAuth.noticePeriod',
    synonyms: [
      'notice period',
      'noticeperiod',
      'notice',
      'current notice period',
      'resignation notice',
      'how much notice',
    ],
    inputTypes: ['text', 'select'],
    priority: 50,
  },
  {
    profileKey: 'workAuth.willingToRelocate',
    synonyms: [
      'relocate',
      'willing to relocate',
      'relocation',
      'open to relocation',
      'able to relocate',
    ],
    inputTypes: ['radio', 'select'],
    priority: 50,
  },
];

// ============================================================
// Utility: Normalize text for matching
// ============================================================

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')        // normalize whitespace
    .trim();
}

// ============================================================
// Utility: Get profile value by key path
// ============================================================

export function getProfileValue(profile: Record<string, unknown>, keyPath: string): string {
  const keys = keyPath.split('.');
  let value: unknown = profile;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  
  return typeof value === 'string' ? value : '';
}

// ============================================================
// Yes/No Detection for Radio/Select
// ============================================================

export const YES_PATTERNS = ['yes', 'true', 'y', '1', 'affirmative'];
export const NO_PATTERNS = ['no', 'false', 'n', '0', 'negative'];

export function isYesNoQuestion(labelText: string): boolean {
  const normalized = normalizeText(labelText);
  return FIELD_MAPPINGS.some(
    mapping =>
      (mapping.profileKey.includes('authorized') ||
        mapping.profileKey.includes('sponsorship') ||
        mapping.profileKey.includes('relocate')) &&
      mapping.synonyms.some(syn => normalized.includes(syn))
  );
}


