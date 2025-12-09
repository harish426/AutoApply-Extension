chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ loggedIn: false });
});

function updatePanel(loggedIn) {
  if (loggedIn) {
    chrome.sidePanel.setOptions({ path: 'popup.html' });
  } else {
    chrome.sidePanel.setOptions({ path: 'login.html' });
  }
}

chrome.storage.local.get('loggedIn', (data) => {
  updatePanel(data.loggedIn);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.loggedIn) {
    updatePanel(changes.loggedIn.newValue);
  }
});

// Open the side panel on the current tab when the extension icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
