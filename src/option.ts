import "./styles.css";

// Function to display the blacklist and whitelist in their respective text areas
function showBlacklist(): void {
  // Find the export button
  const exportButton = document.getElementById('export') as HTMLButtonElement;
  const importButton = document.getElementById('import') as HTMLInputElement;

  // Add a click event listener to the export button
  exportButton.addEventListener('click', downloadDataAsJson);
  importButton.addEventListener('change', importDataFromJson);

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
    let blacklist = blacklistTextArea.value.split('\n').filter(userId => userId.trim() !== '').reduce((obj, userId) => ({ ...obj, [userId]: true }), {});
    let whitelist = whitelistTextArea.value.split('\n').filter(userId => userId.trim() !== '').reduce((obj, userId) => ({ ...obj, [userId]: true }), {});
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

window.onload = function () {
  // Fetch the latest release from your GitHub repository
  fetch('https://api.github.com/repos/taroj1205/chrome-twitter-bots/releases/latest')
    .then(response => response.json())
    .then(data => {
      const serverVersion = data.tag_name;

      const currentVersion = "v1.0.3";

      // Remove the 'v' from the version strings
      const currentVersionNumber = parseFloat(currentVersion.replace('v', ''));
      const serverVersionNumber = parseFloat(serverVersion.replace('v', ''));

      // If the current version is smaller than the server version, notify the user
      if (currentVersionNumber < serverVersionNumber) {
        const noticeElement = document.getElementById('notice') as HTMLDivElement;
        const message = `A new version of this extension is available. Please update to the latest version.`
        const link = `https://github.com/taroj1205/chrome-twitter-bots/releases/tag/latest`
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.className = 'text-lg text-red-600';
        const linkElement = document.createElement('a');
        linkElement.href = link;
        linkElement.target = '_blank';
        linkElement.textContent = 'Click here to update';
        linkElement.className = 'text-blue-500 underline';
        noticeElement.appendChild(messageElement);
        noticeElement.appendChild(linkElement);
      }

    })
    .catch(error => console.error('Error:', error));
};

// Function to download data as JSON file
function downloadDataAsJson(): void {
  // Get the blacklist and whitelist from storage
  chrome.storage.sync.get(['blacklist', 'whitelist'], function(data) {
    // Initialize the blacklist and whitelist with the stored data, or empty objects if no data was found
    let blacklist = data.blacklist || {};
    let whitelist = data.whitelist || {};

    // Prepare the data to be downloaded
    let dataToDownload = {
      blacklist: Object.keys(blacklist),
      whitelist: Object.keys(whitelist)
    };

    // Convert the data to a JSON string
    let dataStr = JSON.stringify(dataToDownload);

    // Create a Blob object with the data
    let dataBlob = new Blob([dataStr], { type: 'application/json' });

    // Create a URL for the Blob object
    let url = URL.createObjectURL(dataBlob);

    // Create a link element
    let link = document.createElement('a');

    // Set the href and download attributes of the link
    link.href = url;
    link.download = 'data.json';

    // Append the link to the body
    document.body.appendChild(link);

    // Simulate a click on the link
    link.click();

    // Remove the link from the body
    document.body.removeChild(link);
  });
}

// Function to import data from JSON file
function importDataFromJson(event: Event): void {
  // Get the file from the event
  const file = (event.target as HTMLInputElement).files?.[0];

  // Create a new FileReader
  const reader = new FileReader();

  // Add a load event listener to the FileReader
  reader.addEventListener('load', function() {
    // Parse the data from the file
    const data = JSON.parse(reader.result as string);

    // Get the blacklist and whitelist from the data
    const blacklistArray = data.blacklist || [];
    const whitelistArray = data.whitelist || {};

    // Convert the arrays back into objects
    const blacklist: { [key: string]: boolean } = blacklistArray.reduce((obj: { [key: string]: boolean }, userId: string) => ({ ...obj, [userId]: true }), {});
    const whitelist: { [key: string]: boolean } = whitelistArray.reduce((obj: { [key: string]: boolean }, userId: string) => ({ ...obj, [userId]: true }), {});

    // Save the blacklist and whitelist to storage
    chrome.storage.sync.set({ 'blacklist': blacklist, 'whitelist': whitelist });

    // Update the text areas with the new data
    let blacklistTextArea = document.getElementById('blacklist') as HTMLTextAreaElement;
    let whitelistTextArea = document.getElementById('whitelist') as HTMLTextAreaElement;
    blacklistTextArea.value = Object.keys(blacklist).join('\n');
    whitelistTextArea.value = Object.keys(whitelist).join('\n');
  });

  // Read the file as text
  if (file) {
    reader.readAsText(file);
  }
}