// ============================================================
// WORKDAY COPILOT - Service Worker (Background Script)
// Handles extension lifecycle and cross-context messaging
// ============================================================

// Log when service worker is installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Workday Copilot installed:', details.reason);
  
  if (details.reason === 'install') {
    // Open onboarding or options page on first install
    // chrome.runtime.openOptionsPage();
  }
});

// Listen for tab updates to detect Workday pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isWorkday = tab.url.includes('myworkdayjobs.com');
    
    // Update extension icon based on whether we're on Workday
    if (isWorkday) {
      chrome.action.setIcon({
        tabId,
        path: {
          16: 'icons/icon16.png',
          32: 'icons/icon32.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png',
        },
      });
      chrome.action.setBadgeText({ tabId, text: '' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
    } else {
      // Optionally show a different state for non-Workday pages
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle any background-specific messages here
  // For V1, most logic is in popup/content script
  
  if (message.type === 'GET_EXTENSION_INFO') {
    sendResponse({
      version: chrome.runtime.getManifest().version,
      name: chrome.runtime.getManifest().name,
    });
    return true;
  }
  
  return false;
});

console.log('Workday Copilot: Service worker started');


