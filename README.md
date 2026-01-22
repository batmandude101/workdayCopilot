# Workday Copilot

**Apply to Workday jobs 3–5× faster with intelligent, user-controlled autofill.**

A Chrome extension that helps job seekers save time on Workday applications by autofilling repetitive fields from a reusable career profile.

## Features

- **Career Profile**: Create one profile, use it everywhere
- **Smart Autofill**: Fill 8-12 common fields with one click
- **Preview Mode**: See what will be filled before filling
- **Undo Support**: Restore previous values instantly
- **Application Tracker**: Keep track of where you've applied
- **CSV Export**: Export your application history

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Chrome browser

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd workday-copilot
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **Load in Chrome:**
   - Open `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder

### Development

For development with auto-rebuild:

```bash
npm run watch
```

Then reload the extension in Chrome after changes.

## Project Structure

```
workday-copilot/
├── src/
│   ├── popup/           # Popup UI logic
│   ├── content/         # Content script (DOM manipulation)
│   ├── background/      # Service worker
│   └── shared/          # Types, storage, field mappings
├── public/
│   ├── manifest.json    # Extension manifest
│   ├── popup.html       # Popup HTML
│   ├── styles/          # CSS
│   └── icons/           # Extension icons
└── dist/                # Built extension (git-ignored)
```

## How It Works

1. **Profile**: You fill out your career profile once in the extension popup
2. **Detection**: On any `*.myworkdayjobs.com` page, the extension activates
3. **Matching**: Click "Preview" to see which fields can be filled
4. **Filling**: Click "Fill Page" to populate matched fields
5. **Tracking**: After submitting, click "Mark as Applied" to save to history

## Field Matching

The extension matches form fields using:
- Label text and `for` attributes
- `aria-label` attributes
- `name` and `id` attributes
- Placeholder text

Supported fields:
- Name (first, last)
- Contact (email, phone)
- Address (street, city, state, country, postal code)
- Links (LinkedIn, portfolio, GitHub)
- Work authorization questions

## Privacy & Security

- ✅ **Local-only storage**: All data stays in your browser
- ✅ **No external servers**: Nothing is sent anywhere
- ✅ **User-initiated**: Only fills when you click the button
- ✅ **No auto-submit**: Never clicks Submit for you
- ✅ **Undo support**: Restore previous values anytime

## License

MIT


