// Get the current status of the extension from Chrome's storage
chrome.storage.sync.get('extensionEnabled', (data) => {
  // Toggle the status of the extension
  let newStatus = !data.extensionEnabled;

  // Save the new status back to Chrome's storage
  chrome.storage.sync.set({ extensionEnabled: newStatus }, () => {
    // Determine the text for the badge based on the new status
    let badgeText = newStatus ? 'ON' : 'OFF';

    // Set the badge text to reflect the new status of the extension
    chrome.action.setBadgeText({ text: badgeText });
  });
});