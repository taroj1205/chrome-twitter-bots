// Define the structure of a Tweet
export type Tweet = {
  user_name: string;
  user_id: string;
  content: string | null;
  isConversation: boolean;
  tweetOwner: boolean;
  verified: boolean;
  language: string;
};

console.log('Twitter Hide Blocked Users Extension is active.');

// Function to extract user data from a tweet element
function getUserData(tweetElement: Element): Tweet | null {
  try {
    // Find the user name element within the tweet
    const userNameElement = tweetElement.querySelector('[data-testid="User-Name"]') as HTMLDivElement;
    const content = tweetElement.querySelector('[data-testid="tweetText"]') as HTMLDivElement;
    let lang = null;

    if (content && content.getAttribute('lang')) {
      lang = content.getAttribute('lang');
      console.log(lang)
    }

    const verified = Boolean(userNameElement.querySelector('[data-testid="icon-verified"]'));

    const parentDiv = tweetElement.closest('div[data-testid="cellInnerDiv"]') as HTMLDivElement;
    const style = window.getComputedStyle(parentDiv.children[0]);
    const borderColor = style.getPropertyValue('border-bottom-color');

    // Extract the user name text, if it exists
    const userName = userNameElement?.textContent || '';

    // Split the user name into name and id parts
    const [name, id] = userName.split(/(@[^·]+)/).map(part => part.trim().replace('@', ''));

    // Check if the user id matches the id in the current URL
    const urlFormat = /^https:\/\/twitter\.com\/(\w+)\/status\/\d+$/;
    const match = window.location.href.match(urlFormat);
    const tweetOwner = match ? match[1] !== id : false;

    // Return the extracted user data
    return {
      user_name: name,
      user_id: id,
      content: content?.textContent || '',
      isConversation: borderColor ? !['rgb(47, 51, 54)', 'rgb(56, 68, 77)', 'rgb(239, 243, 244)'].includes(borderColor) : false,
      tweetOwner: tweetOwner,
      verified: verified,
      language: lang || '',
    };
  } catch (error) {
    console.error('An error occurred while extracting user data:', error);
    return null;
  }
}

type TweetsResult = {
  tweets: Tweet[];
  badTweets: Tweet[];
};

// Function to count the number of replies from each user
function getRepliesCount(tweets: Tweet[]): Record<string, number> {
  const repliesCount: Record<string, number> = {};
  tweets.forEach(tweet => {
    if (!repliesCount[tweet.user_id]) {
      repliesCount[tweet.user_id] = 0;
    }
    repliesCount[tweet.user_id]++;
  });
  console.log(repliesCount)
  return repliesCount;
}

// Function to add users to the blacklist if they have more than 3 replies
function addToBlacklist(repliesCount: Record<string, number>, badTweets: Tweet[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['blacklist', 'whitelist'], function (data) {
      try {
        let blacklist = data.blacklist || {};
        let whitelist = data.whitelist || {};
        Object.entries(repliesCount).forEach(([userId, count]) => {
          if (count > 3 && !whitelist[userId]) {
            blacklist[userId] = true;
          }
        });
        badTweets.forEach(tweet => {
          if (!whitelist[tweet.user_id]) {
            blacklist[tweet.user_id] = true;
          }
        });
        writeToStorage('blacklist', blacklist);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Function to hide tweets from blacklisted users and bad tweets
function hideBlacklistedTweets(tweets: Tweet[], badTweets: Tweet[]): void {
  chrome.storage.sync.get(['blacklist', 'whitelist'], function (data) {
    const blacklist = new Set(Object.keys(data.blacklist || {}));
    const whitelist = new Set(Object.keys(data.whitelist || {}));
    const userIds = [...tweets, ...badTweets].map(tweet => tweet.user_id);

    const tweetElements = document.querySelectorAll(`article[data-testid="tweet"]:not([aria-blocked="true"])`);
    tweetElements.forEach(element => {
      const userData = getUserData(element);
      if (userData && userIds.includes(userData.user_id) && blacklist.has(userData.user_id) && !whitelist.has(userData.user_id)) {
        const parentDiv = element.closest('div[data-testid="cellInnerDiv"]');
        (parentDiv as HTMLElement).style.display = 'none';
        (element as HTMLElement).setAttribute('aria-blocked', 'true');
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

// Function to extract tweets
function extractTweets(): Tweet[] {
  // Find all tweet elements on the page
  const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');

  // Map each tweet element to its user data
  const tweets = Array.from(tweetElements).map(getUserData);

  // Filter out null values
  return tweets.filter(tweet => tweet !== null) as Tweet[];
}

// Function to categorize tweets
function categorizeTweets(tweets: Tweet[], originalLang: string | null): TweetsResult {
  // Filter out bad tweets
  const badTweets = tweets.filter(tweet => isBadTweet(tweet, originalLang));

  // Remove bad tweets from the tweets array
  const goodTweets = tweets.filter(tweet => !badTweets.includes(tweet));

  return { tweets: goodTweets, badTweets };
}

// Function to determine if a tweet is bad
function isBadTweet(tweet: Tweet, originalLang: string | null): boolean {
  // Check if the user is verified and the content is only emoji or if the language is different
  return tweet.verified && (tweet.content === null || tweet.content.length === 0 || tweet.language !== originalLang) && !tweet.isConversation;
}

// Function to process tweets, either on scroll or every 2 seconds
const processTweets = () => {
  const urlFormat = /^https:\/\/twitter\.com\/\w+\/status\/\d+$/;
  if (urlFormat.test(window.location.href)) {
    if (extensionEnabled) {
      const tweets = extractTweets();
      const originalLang = tweets[0]?.language || null;
      const { tweets: goodTweets, badTweets } = categorizeTweets(tweets, originalLang);
      const repliesCount = getRepliesCount(goodTweets);
      addToBlacklist(repliesCount, badTweets).then(() => {
        hideBlacklistedTweets(goodTweets, badTweets);
      });
    }
  }
};

// Debounce the processTweets function
const debounce = (func: Function, delay: number) => {
  let debounceTimer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func(...args), delay);
  }
}

// Run processTweets on scroll event
document.addEventListener('scroll', debounce(processTweets, 200));

// Also run processTweets every 2 seconds
setInterval(processTweets, 2000);

type Cache = Record<string, unknown>;

let cache: Cache = {};
let cacheTimer: NodeJS.Timeout | null = null;

function writeToStorage(key: string, value: unknown): void {
  cache[key] = value;

  if (!cacheTimer) {
    cacheTimer = setTimeout(() => {
      chrome.storage.sync.set(cache, () => {
        cache = {};
        clearTimeout(cacheTimer as NodeJS.Timeout);
        cacheTimer = null;
      });
    }, 500);
  }
}