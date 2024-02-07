// Define the structure of a Tweet
export type Tweet = {
  user_name: string;
  user_id: string;
  content: string | null;
  hasContent: boolean;
  isConversation: boolean;
  isTweetOwner: boolean;
  verified: boolean;
  language: string;
  quoteOnly: boolean;
};

console.log('Twitter Hide Blocked Users Extension is active.');

// Function to extract user data from a tweet element
function getUserData(tweetElement: Element): Tweet | null {
  try {
    // Find the user name element within the tweet
    const userNameElement = tweetElement.querySelectorAll('[data-testid="User-Name"]');
    const content = tweetElement.querySelector('[data-testid="tweetText"]') as HTMLDivElement;
    const hasContent = Boolean(content);

    let lang = null;

    if (content && content.getAttribute('lang')) {
      lang = content.getAttribute('lang');
    }

    const verified = Boolean(userNameElement[0].querySelector('[data-testid="icon-verified"]'));

    const parentDiv = tweetElement.closest('div[data-testid="cellInnerDiv"]') as HTMLDivElement;
    const style = window.getComputedStyle(parentDiv.children[0]);
    const borderColor = style.getPropertyValue('border-bottom-color');

    const userName = userNameElement[0].querySelectorAll('a');
    const name = String(userName[0].textContent);
    const id = userName[1]?.textContent?.replace('@', '') || '';

    // Check if the user id matches the id in the current URL
    const urlFormat = /^https:\/\/twitter\.com\/(\w+)\/status\/\d+$/;
    const match = window.location.href.match(urlFormat);
    const isTweetOwner = match && match[1] === id || false;

    const isConversation = borderColor ? !['rgb(47, 51, 54)', 'rgb(56, 68, 77)', 'rgb(239, 243, 244)'].includes(borderColor) : false

    // Return the extracted user data
    return {
      user_name: name,
      user_id: id,
      content: content?.textContent || '',
      isConversation: isConversation,
      isTweetOwner: isTweetOwner,
      verified: verified,
      hasContent: hasContent,
      language: lang || '',
      quoteOnly: !hasContent && userNameElement.length > 1
    };
  } catch (error) {
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
    if (!tweet.isTweetOwner && !tweet.isConversation) {
      if (emojiOrQuotesBlacklist && !tweet.hasContent) return
      repliesCount[tweet.user_id]++
    };
  });
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
          if (count > 2 && !whitelist[userId]) {
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
let emojiOrQuotesBlacklist = false;

// Get the initial state of the extension from storage
chrome.storage.sync.get('extensionEnabled', function (data) {
  extensionEnabled = data.extensionEnabled !== undefined ? data.extensionEnabled : true;
});

// Get the initial state of the emojiOrQuotesBlacklist from storage
chrome.storage.sync.get('emojiOrQuotesBlacklist', function (data) {
  emojiOrQuotesBlacklist = data.emojiOrQuotesBlacklist !== undefined ? data.emojiOrQuotesBlacklist : false;
});

// Listen for changes to the extension's state in storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.extensionEnabled) {
    extensionEnabled = changes.extensionEnabled.newValue;
  }
  if (changes.emojiOrQuotesBlacklist) {
    emojiOrQuotesBlacklist = changes.emojiOrQuotesBlacklist.newValue;
  }
});

// Function to extract tweets
function extractTweets(): Tweet[] {
  // Find all tweet elements on the page
  const tweetElements = document.querySelectorAll('article[data-testid="tweet"]:not([aria-blocked="true"]');

  // Map each tweet element to its user data
  const tweets = Array.from(tweetElements).map(getUserData);

  // Filter out null values
  return tweets.filter(tweet => tweet !== null) as Tweet[];
}

// Function to categorize tweets
function categorizeTweets(tweets: Tweet[], originalLang: string | null): TweetsResult {
  let badTweets: Tweet[] = [];

  // Filter out bad tweets only if emojiOrQuotesBlacklist is true
  if (emojiOrQuotesBlacklist) {
    badTweets = tweets.filter(tweet => isBadTweet(tweet));
  }

  // Remove bad tweets from the tweets array
  const goodTweets = tweets.filter(tweet => !badTweets.includes(tweet));

  return { tweets: goodTweets, badTweets };
}

// Function to determine if a tweet is bad
function isBadTweet(tweet: Tweet): boolean {
  // Check if the user is verified and the content is only emoji or if the language is different
  // and if the HTML content does not contain an <a> tag
  return tweet.verified && !tweet.isTweetOwner && (tweet.content === null || tweet.content.length === 0 || tweet.quoteOnly) && !tweet.isConversation && tweet.hasContent;
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