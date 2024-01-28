import "./styles.css";

// Function to display the blacklist and whitelist in their respective text areas
function showBlacklist(): void {
  // Get the blacklist and whitelist from storage
  chrome.storage.sync.get(['blacklist', 'whitelist'], function(data) {
    // Initialize the blacklist and whitelist with the stored data, or empty objects if no data was found
    let blacklist = data.blacklist || {};
    let whitelist = data.whitelist || {};
    // Convert the user ids in the blacklist and whitelist to strings
    let blacklistedUsers = Object.keys(blacklist).join('\n');
    let whitelistedUsers = Object.keys(whitelist).join('\n');
    // Find the text areas for the blacklist and whitelist
    let blacklistTextArea = document.getElementById('blacklist') as HTMLTextAreaElement;
    let whitelistTextArea = document.getElementById('whitelist') as HTMLTextAreaElement;
    // Set the values of the text areas to the user ids
    blacklistTextArea.value = blacklistedUsers;
    whitelistTextArea.value = whitelistedUsers;

    // Add event listeners to update line numbers on textarea changes
    [blacklistTextArea, whitelistTextArea].forEach(textarea => {
      // Identify the correct line number container based on the textarea
      const lineNumberContainerId = textarea.id === 'blacklist' ? 'line-numbers1' : 'line-numbers2';
      const lineNumbersEle = document.getElementById(lineNumberContainerId) as HTMLDivElement;

      const displayLineNumbers = () => {
        const lines = textarea.value.split('\n');
        lineNumbersEle.innerHTML = Array.from({
          length: lines.length,
        }, (_, i) => `<div>${i + 1}</div>`).join('');
      }

      textarea.addEventListener('input', displayLineNumbers);
      displayLineNumbers();
    });
  });

  // Find the save button
  const saveButton = document.getElementById('save') as HTMLButtonElement;

  // Add a click event listener to the save button
  saveButton.addEventListener('click', function () {
    // Find the text areas for the blacklist and whitelist
    let blacklistTextArea = document.getElementById('blacklist') as HTMLTextAreaElement;
    let whitelistTextArea = document.getElementById('whitelist') as HTMLTextAreaElement;
    // Convert the values of the text areas to objects
    let blacklist = blacklistTextArea.value.split('\n').reduce((obj, userId) => ({ ...obj, [userId]: true }), {});
    let whitelist = whitelistTextArea.value.split('\n').reduce((obj, userId) => ({ ...obj, [userId]: true }), {});
    // Save the blacklist and whitelist to storage
    chrome.storage.sync.set({ 'blacklist': blacklist, 'whitelist': whitelist });
    
    // Update the text of the save button to indicate that the changes have been saved
    saveButton.textContent = 'Saved!';

    // Reset the text of the save button after 1 second
    setTimeout(function() {
      saveButton.textContent = 'Save';
    }, 1000)
  });
}

// Run the showBlacklist function when the document has finished loading
document.addEventListener('DOMContentLoaded', showBlacklist);