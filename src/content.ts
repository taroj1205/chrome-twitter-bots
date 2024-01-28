// Define the structure of a Tweet
export type Tweet = {
  user_name: string;
  user_id: string;
};

console.log('Twitter Hide Blocked Users Extension is active.');

// Function to extract user data from a tweet element
function getUserData(tweetElement: Element): Tweet {
  // Find the user name element within the tweet
  const userNameElement = tweetElement.querySelector('[data-testid="User-Name"]');

  const parentDiv = tweetElement.closest('div[data-testid="cellInnerDiv"]');

  // If the parent div doesn't exist, return an empty Tweet object
  if (!parentDiv) {
    return {
      user_name: '',
      user_id: '',
    };
  }

  // Get the style of the parent div
  const style = window.getComputedStyle(parentDiv.children[0]);

  const borderColor = style.getPropertyValue('border-bottom-color');
  const borderColors = ['rgb(47, 51, 54)', 'rgb(56, 68, 77)', 'rgb(239, 243, 244)'];
  if (!borderColors.includes(borderColor)) {
    // If the tweet doesn't have a border bottom color of one of the expected colors, return an empty Tweet object
    return {
      user_name: '',
      user_id: '',
    };
  }

  // Extract the user name text, if it exists
  const userName = userNameElement ? userNameElement.textContent : null;

  // If no user name was found, return an empty Tweet object
  if (!userName) {
    return {
      user_name: '',
      user_id: '',
    };
  }

  // Split the user name into name and id parts
  const parts = userName ? userName.split(/(@[^·]+)/) : ['', ''];
  const name = parts[0].trim();
  const id = parts[1].replace('@', '').trim();

  // Check if the user id matches the id in the current URL
  const urlFormat = /^https:\/\/twitter\.com\/(\w+)\/status\/\d+$/;
  const match = window.location.href.match(urlFormat);
  if (match && id === match[1]) return {
    user_name: '',
    user_id: '',
  };

  // Return the extracted user data
  return {
    user_name: name,
    user_id: id,
  };
}

// Function to get all tweets on the page
function getTweets(): Tweet[] {
  // Find all tweet elements on the page
  const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
  // Map each tweet element to its user data
  const tweets = Array.from(tweetElements).map(getUserData);
  return tweets;
}

// Function to count the number of replies from each user
function getRepliesCount(tweets: Tweet[]): Record<string, number> {
  const repliesCount: Record<string, number> = {};
  tweets.forEach(tweet => {
    if (tweet.user_id.length <= 0) {
      return;
    }
    if (!repliesCount[tweet.user_id]) {
      repliesCount[tweet.user_id] = 0;
    }
    repliesCount[tweet.user_id]++;
  });
  return repliesCount;
}

// Function to add users to the blacklist if they have more than 3 replies
function addToBlacklist(repliesCount: Record<string, number>): void {
  chrome.storage.sync.get(['blacklist', 'whitelist'], function (data) {
    let blacklist = data.blacklist || {};
    let whitelist = data.whitelist || {};
    Object.entries(repliesCount).forEach(([userId, count]) => {
      if (count > 3 && !whitelist[userId]) {
        blacklist[userId] = true;
      }
    });
    chrome.storage.sync.set({ 'blacklist': blacklist });
  });
}

// Function to hide tweets from blacklisted users
function hideBlacklistedTweets(): void {
  const tweets = getTweets();
  const userIds = tweets.map(tweet => tweet.user_id);

  chrome.storage.sync.get(['blacklist', 'whitelist'], function (data) {
    const blacklist = data.blacklist || {};
    const whitelist = data.whitelist || {};
    const tweetElements = document.querySelectorAll(`article[data-testid="tweet"]`);
    tweetElements.forEach(element => {
      const userData = getUserData(element);
      if (userIds.includes(userData.user_id) && blacklist[userData.user_id] && !whitelist[userData.user_id]) {
        (element as HTMLElement).style.display = 'none';
      }
    });
  });
}

// Flag to indicate if the extension is enabled
let extensionEnabled = true;

// Get the initial state of the extension from storage
chrome.storage.sync.get('extensionEnabled', function (data) {
  extensionEnabled = data.extensionEnabled !== undefined ? data.extensionEnabled : true;
});

// Listen for changes to the extension's state in storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
  }
});

// Function to process tweets, either on scroll or every 2 seconds
const processTweets = () => {
  const urlFormat = /^https:\/\/twitter\.com\/\w+\/status\/\d+$/;
  if (urlFormat.test(window.location.href)) {
    if (extensionEnabled) {
      const tweets = getTweets();
      const repliesCount = getRepliesCount(tweets);
      addToBlacklist(repliesCount);
      hideBlacklistedTweets();
    }
  }
};

// Run processTweets on scroll event
document.addEventListener('scroll', processTweets);

// Also run processTweets every 2 seconds
setInterval(processTweets, 2000);