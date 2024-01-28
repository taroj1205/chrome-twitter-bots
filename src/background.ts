chrome.action.onClicked.addListener((tab) => {
  // Get the current status of the extension from storage
  chrome.storage.sync.get('extensionEnabled', (data) => {
    // Toggle the status
    let newStatus = !data.extensionEnabled;

    // Save the new status to storage
    chrome.storage.sync.set({ extensionEnabled: newStatus }, () => {
      // Set the badge text to 'ON' if the extension is enabled, 'OFF' otherwise
      let badgeText = newStatus ? 'ON' : 'OFF';
      addBadge(badgeText);
    });
  });
});

const addBadge = (status: string) => {
  chrome.action.setBadgeText({ text: status });
}

// Get the current status of the extension from storage
chrome.storage.sync.get('extensionEnabled', (data) => {
  addBadge(data.extensionEnabled ? 'ON' : 'OFF');
});