/**
 * *AREA: User setting variables *
 */

/** @type {boolean} - default/intial extension setting to enable/disable the negativity filter */
let enableNegativityFilter = true;
/** @type {boolean} - default/intial extension setting to enable/disable the shorts filter */
let enableShortsFilter = true;
/** @type {string} - class name used to determine how to filter a video (weak, medium, strong, hide) */
let filterBlurOptionsClass = "yt-neg-filter-on-medium";
/** @type {string} - class name used to enable video hover preview (show/hide) */
let videoHoverPreviewOptionsClass = "yt-neg-filter-mouseover-show";
/** @type {string} - class name used to hide videos during load in and AI processing */
let loadingBlurClass = "yt-neg-filter-on-medium";

/**
 * *AREA: Modifiable Variables *
 */

/** @type {MutationObserver | null} - global variable of the mutation observer watching for new YT videos. Is reset when a category tab is clicked. */
let globalContentsObserver = null;

/** @type {boolean} - true when videos are being parsed, false when ALL videos have finished being parsed */
let isCurrentlyParsingVideos = false;

/**
 * * AREA: Const variables for determining which selectors to use *
 * * (video page vs. homepage) *
 */

/**@type {boolean} - True if the URL is for a YT video page, false if it is for the Homepage*/
const IS_VIDEO_PAGE = window.location.href.includes(
	"https://www.youtube.com/watch?v=" // URL for video pages
)
	? true // Video page
	: false; // Homepage

// ! This is unused. Left for now, incase we need it.
/**@type {"ytd-page-manager #secondary" | "ytd-page-manager #primary"} - The parent element which we will look for incase the CONTENTS_ELEMENT_SELECTOR is swapped on on specific YT category pages */
const CONTENTS_PARENT_SELECTOR = IS_VIDEO_PAGE
	? "ytd-page-manager #secondary" // Video page
	: "ytd-page-manager #primary"; // Homepage

/**@type {"#content iron-selector yt-chip-cloud-chip-renderer" | "#header iron-selector yt-chip-cloud-chip-renderer"} - Determines if category tab selector should be configured for the video page or homepage */
const CATEGORY_TAB_SELECTOR = IS_VIDEO_PAGE
	? "#content iron-selector yt-chip-cloud-chip-renderer" // Video page
	: "#header iron-selector yt-chip-cloud-chip-renderer"; // Homepage

/**@type {"ytd-compact-video-renderer" | "ytd-rich-item-renderer"} - Determines if video card selector should be configured for the video page or homepage */
const VIDEO_CARD_SELECTOR = IS_VIDEO_PAGE
	? "ytd-compact-video-renderer" // Video page
	: "ytd-rich-item-renderer"; // Homepage

/**@type {"#contents.ytd-item-section-renderer:has(ytd-compact-video-renderer)" | "#contents.ytd-rich-grid-renderer"} - The closest parent element to observe for when video cards will load in on the video page or homepage */
const CONTENTS_ELEMENT_SELECTOR = IS_VIDEO_PAGE
	? "#contents.ytd-item-section-renderer:has(ytd-compact-video-renderer)" // Video page
	: "#contents.ytd-rich-grid-renderer"; // Homepage

/**@type {"ytd-reel-shelf-renderer" | "ytd-rich-shelf-renderer"} - Determines if the shorts selector should be configured for the video page or homepage */
const SHORTS_SECTION_SELECTOR = IS_VIDEO_PAGE
	? "ytd-reel-shelf-renderer" // Video page
	: "ytd-rich-shelf-renderer"; // Homepage

/**
 * *AREA: Handle Receiving User Settings *
 */

// Get initial user settings from storage after page load (document_idle)
// This is necessary because popup.js only runs when the popup.html is opened
chrome.storage.local.get("userSettings", (result) => {
	console.log("contentScripts.js 1: Storage result: ", result);
	if (result.userSettings !== undefined) {
		console.log(
			"contentScripts.js 1: Storage result settings: ",
			result.userSettings
		);
		result.userSettings.forEach(updateState);
	}
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("contentScripts.js 2: Received request", request);
	if (request.userSettings) {
		console.log(
			"contentScripts.js 2: Received userSettings",
			request.userSettings
		);
		request.userSettings.forEach(updateState);
	}
});

// Helper function to update state based on the setting name
function updateState(setting) {
	// Enable or disable the negativity filter (hide negative videos)
	if (setting.name === "negativityFilterToggleState") {
		enableNegativityFilter = setting.enabled;
		console.log(
			`Negativity Filter ${setting.enabled ? "enabled" : "disabled"}`
		);
	}
	// Enabled or disable the shorts filter (hide shorts)
	if (setting.name === "shortsFilterToggleState") {
		enableShortsFilter = setting.enabled;
		console.log(`Shorts Filter ${setting.enabled ? "enabled" : "disabled"}`);
	}
	// Update the filter blur options (low, medium, high, hide)
	if (setting.name === "filterBlurOptions") {
		filterBlurOptionsClass = `yt-neg-filter-on-${setting.activeSetting}`;
		console.log("Filter Blur Options:", setting.activeSetting);
	}
	// Update the video hover preview options (show, hide)
	if (setting.name === "videoHoverPreviewOptions") {
		videoHoverPreviewOptionsClass = `yt-neg-filter-mouseover-${setting.activeSetting}`;
		console.log("Video Hover Preview Options:", setting.activeSetting);
	}
}

/*
 * AREA: Handle changing category tabs and clicking YT Logo *
 */

/**
 * Add click events to all category tabs and handle correctly processing new videos after a category tab is clicked
 */
function handleTabsFiltering() {
	document
		.querySelectorAll(CATEGORY_TAB_SELECTOR)
		.forEach((tabElement, index) => {
			tabElement.addEventListener("click", () => {
				if (index === 0) {
					// Force page to reload: needed because YT is jacked
					setTimeout(handleReloadingHomePage(tabElement), 0);
					document.querySelector("ytd-topbar-logo-renderer#logo > a").click();
				}
				// 1. Remove existing mutation observer
				disconnectContentsObserver();

				// 2. Remove all added classes
				restartVideoProcessing();

				// 3. Set up a new mutation observer to restart filtering
				attemptToObserveVideoContainer();
			});
		});
}

/**
 *   Removes previously applied filters on existing DOM elements.
 */
function restartVideoProcessing() {
	console.log("RestartVideoProcessing Called! 🧼");
	// Remove previously applied filter classes from video cards
	document.querySelectorAll(VIDEO_CARD_SELECTOR).forEach((videoCard) => {
		videoCard.classList.remove(
			"parsed",
			loadingBlurClass,
			videoHoverPreviewOptionsClass,
			filterBlurOptionsClass
		);
	});
}

/**
 * Clicking the YT logo uses some sort of cache, need to manually reload the
 * page otherwise no filtering occurs
 */
function handleYouTubeLogoClick() {
	const youTubeLogo = document.querySelector(
		"ytd-topbar-logo-renderer#logo > a"
	);

	if (!youTubeLogo) return;

	handleReloadingHomePage(youTubeLogo);
}

/**
 * Reloads youtube.com to load in new videos and restart filtering
 * @param {HTMLElement} element - a HTML element to add a click event to
 */
function handleReloadingHomePage(element) {
	element.addEventListener("click", (e) => {
		// If Ctrl (Windows/Linux), Meta (Cmd on Mac), Shift, Alt, or middle-click are used, let default happen
		if (
			e.ctrlKey ||
			e.metaKey ||
			e.shiftKey ||
			e.altKey ||
			e.button === 1 // middle click
		) {
			// Let default browser behavior happen (e.g., open in new tab)
			return;
		}

		// Prevent default navigation
		e.preventDefault();

		// Manually redirect to force page reload
		window.location.href = "https://www.youtube.com/";
	});
}

/**
 * * Main Functionality: 6-steps + Last Step *
 */

/**
 * 0. Attempt to setup observer for the closest parent element of video cards.
 * Will attempt 10 times per second for 7 seconds, waiting for the DOM to load
 */
function attemptToObserveVideoContainer() {
	let attempts = 0;
	const maxAttempts = 280; // 25ms * 280 = 7,000ms (7 seconds)

	const interval = setInterval(() => {
		const observerContainer = document.querySelector(CONTENTS_ELEMENT_SELECTOR);

		if (observerContainer) {
			clearInterval(interval);
			console.log("Observer Container found (#contents)!👁‍🗨");

			// 1. Setup observer to wait for video cards to load in and handle scrolling new videos in (infinity loading)
			setupContentsObserver(observerContainer);
			return;
		}

		if (++attempts >= maxAttempts) {
			clearInterval(interval);
			console.log("No Observer Container Found! ❌");
		}
	}, 25);
}

// 0. Begin the main functionality
console.log("Interval to Observe CALLED from file root 🟢");
attemptToObserveVideoContainer();

// TODO: Add logic to handle attaching this when DOM is ready. Interval/Mutation observer
setTimeout(() => {
	console.log("Logo logic attached 👍");
	// Enable the app to work if YT logo is clicked
	handleYouTubeLogoClick();

	console.log("Tab logic attached 👍");
	// Enable tabs filtering functionality
	handleTabsFiltering();
}, 1500);

/**
 * 1. Sets up a MutationObserver on the #contents element to detect new videos.
 * @param {Element} contentsElement - The element to observe.
 */
function setupContentsObserver(contentsElement) {
	const observer = new MutationObserver((mutationsList) => {
		console.log("Mutation List: ", mutationsList);

		for (const mutation of mutationsList) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType !== 1) continue;
				console.log("Mutation Observer (Added node) 📋: ", node);

				if (!node.matches?.(`${VIDEO_CARD_SELECTOR}.parsed`)) {
					console.log("New video detected! ✅", node);
					return parseVideoTitles();
				}
			}
			for (const node of mutation.removedNodes) {
				if (node.nodeType !== 1) continue;
				console.log("Mutation Observer (Removed node) 📋: ", node);

				if (!node.matches?.(`${VIDEO_CARD_SELECTOR}.parsed`)) {
					console.log("New video detected! ✅", node);
					return parseVideoTitles();
				}
			}
		}
	});

	// Store in global if not already
	globalContentsObserver = observer;

	observer.observe(contentsElement, { childList: true });
	console.log("Observer set up to detect new videos.");
}

/**
 * Disconnects the global MutationObserver if it exists.
 */
function disconnectContentsObserver() {
	if (globalContentsObserver) {
		globalContentsObserver.disconnect();
		globalContentsObserver = null;
		console.log("Observer disconnected.");
	}
}

/**
 * 2. Handle getting the video titles, sending API request to backend and applying the filter on page load. Also handle hiding shorts.
 */
async function parseVideoTitles() {
	// 3. Hide Shorts on page load if shorts filter enabled
	hideShorts();

	// Skip filtering negative videos
	if (enableNegativityFilter === false) return;

	// Prevent parsing more than 1 time
	if (isCurrentlyParsingVideos) return;

	const videoCards = Array.from(
		document.querySelectorAll(`${VIDEO_CARD_SELECTOR}:not(.parsed)`)
	);

	// No videos are present to filter
	if (videoCards.length < 1) return;

	console.log("Parsing Started: 🚩");
	isCurrentlyParsingVideos = true;

	try {
		// Map each videoCard to a promise
		const parsingPromises = videoCards.map(async (videoCard) => {
			// Apply loading filter + hover preview setting to all videos on page load - only applies if enableNegativityFilter is true (on)
			videoCard.classList.add(loadingBlurClass, videoHoverPreviewOptionsClass);

			const titleElement = videoCard.querySelector("#video-title");
			if (!titleElement) return;

			const title = titleElement.textContent.trim();

			try {
				// 4. Check cache
				const cachedValue = await getCachedValue(title);
				console.log("CachedValue: ", cachedValue, title);

				videoCard.classList.add("parsed");

				// If cached skip processing
				if (cachedValue !== null) {
					console.log("DOM handled from Cache! 💽", title);
					handleDomActions(videoCard, title, cachedValue);
				} else {
					// 5. If not cached process the video title
					const isNegativeVideo = await processVideoTitle(title);

					// 6. Store the results of processVideoTitle() in the cache
					await setCachedValue(title, isNegativeVideo);

					console.log("DOM handled from Server! 🔌", title);
					handleDomActions(videoCard, title, isNegativeVideo);
				}
			} catch (error) {
				console.error("Error processing video:", error, title);
			}
		});

		// Wait for all videos to be parsed before marking as not busy
		await Promise.all(parsingPromises);
	} finally {
		console.log("Parsing completed: 🏁");
		isCurrentlyParsingVideos = false;
	}
}

/**
 * 3. Hides Shorts on page load if shorts filter enabled.
 */
function hideShorts() {
	if (enableShortsFilter === false) return;

	document
		.querySelectorAll(`${SHORTS_SECTION_SELECTOR}:not(.yt-short-filter-on)`)
		.forEach((shortsSection) => {
			shortsSection.classList.add("yt-short-filter-on");
		});
}

/**
 * 5. API call to carry out main function of hiding a single negative video
 * @param {string} videoTitle - a single video title
 * @returns {boolean | undefined} result where true means the video is negative
 */
async function processVideoTitle(videoTitle) {
	/** @type {boolean} - result where true means the video is negative */
	let isNegativeVideo = false;

	// Don't process the video title if the negativity filter is disabled
	if (enableNegativityFilter === false) {
		return isNegativeVideo;
	}

	try {
		console.log("Submitting title to API:", videoTitle);

		isNegativeVideo = await new Promise((resolve, reject) => {
			// Send a message to background.js to call the AI Model API
			chrome.runtime.sendMessage(
				{ type: "fetchNegativityStatus", title: videoTitle },
				(response) => {
					if (chrome.runtime.lastError) {
						return reject(chrome.runtime.lastError.message);
					}
					if (response.result === undefined) {
						return reject("API response was undefined");
					}
					// console.log("ContentScript Results: ", response.results);
					// Commented out to reduce console logs after going to 1 call per video
					resolve(response.result);
				}
			);
		});

		// Return the result of the API call
		return isNegativeVideo;
	} catch (error) {
		console.error("Error calling Model API:", error);
		return isNegativeVideo;
	}
}

/**
 * END / STOP HERE. Determines whether to hide or show a video based on the result of the API call (processVideoTitle -> isNegativeVideo).
 * @param {HTMLElement} videoCard - main video card element
 * @param {string} videoTitle - title of the video
 * @param {boolean} isNegativeVideo - result of the API call to processVideoTitle
 */
function handleDomActions(videoCard, videoTitle, isNegativeVideo) {
	if (isNegativeVideo) {
		// Remove loading blur and apply filter to hide negative video
		videoCard.classList.remove(loadingBlurClass);
		videoCard.classList.add(filterBlurOptionsClass);
		console.log(
			"%cHiding negative video:",
			"color: red; font-size: 16px; font-weight: bold;",
			videoTitle,
			videoCard
		);
	} else {
		// Remove default loading filter and hover effect on the video (show the video as default)
		videoCard.classList.remove(loadingBlurClass, videoHoverPreviewOptionsClass);
	}
}

/*
 * AREA: Client Side Caching section *
 * Video titles are cached in Extension Storage > Local for 5 days *
 */
const CACHE_KEY = "videoTitleCache"; // Root key for all cache entries
const TTL_DURATION = 432000000; // 5 days in milliseconds for Time-To-Live (TTL)
const CLEANUP_INTERVAL = 1000 * 60 * 1; // 1 minute in milliseconds

/** @typedef {{ value: boolean, expires: number }} CacheEntry */

let memoryCache = new Map();

/**
 * Load cache from chrome.storage.local and clean up expired entries.
 */
chrome.storage.local.get([CACHE_KEY], (data) => {
	if (data[CACHE_KEY]) {
		memoryCache = new Map(Object.entries(data[CACHE_KEY]));
	}
	cleanupExpiredEntries();
});

// Periodic cleanup of expired items -> optional
// setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);

/**
 * Retrieves a value from the cache.
 * @param {string} key - The key to retrieve from the cache.
 * @returns {Promise<boolean | null>} - The cached value, or null if not found or expired.
 */
async function getCachedValue(key) {
	if (memoryCache.has(key)) {
		const { value, expires } = /** @type {CacheEntry} */ (memoryCache.get(key));
		if (Date.now() > expires) {
			await removeCachedValue(key);
			return null;
		}
		return value;
	}

	return new Promise((resolve) => {
		chrome.storage.local.get([CACHE_KEY], (data) => {
			const cache =
				/** @type {Record<string, CacheEntry>} */ (data[CACHE_KEY]) || {};
			memoryCache = new Map(Object.entries(cache)); // Sync memory cache

			if (cache[key]) {
				const { value, expires } = cache[key];
				if (Date.now() > expires) {
					removeCachedValue(key);
					resolve(null);
				} else {
					resolve(value);
				}
			} else {
				resolve(null);
			}
		});
	});
}

/**
 * Sets a value in the cache with a Time-To-Live (TTL).
 * @param {string} key - The key to store.
 * @param {boolean} value - The value to store.
 * @param {number} [ttl=TTL_DURATION] - Time-to-live in milliseconds.
 * @returns {Promise<void>}
 */
async function setCachedValue(key, value, ttl = TTL_DURATION) {
	const expires = Date.now() + ttl;
	memoryCache.set(key, { value, expires });

	return new Promise((resolve) => {
		chrome.storage.local.get([CACHE_KEY], (data) => {
			/** @type {Record<string, CacheEntry>} */
			const cache = data[CACHE_KEY] || {};
			cache[key] = { value, expires };
			chrome.storage.local.set({ [CACHE_KEY]: cache }, resolve);
		});
	});
}

/**
 * Removes a key from the cache.
 * @param {string} key - The key to remove.
 * @returns {Promise<void>}
 */
async function removeCachedValue(key) {
	memoryCache.delete(key);
	return new Promise((resolve) => {
		chrome.storage.local.get([CACHE_KEY], (data) => {
			/** @type {Record<string, CacheEntry>} */
			const cache = data[CACHE_KEY] || {};
			delete cache[key];
			chrome.storage.local.set({ [CACHE_KEY]: cache }, resolve);
		});
	});
}

/**
 * Clears the entire cache.
 * @returns {Promise<void>}
 */
async function clearCache() {
	memoryCache.clear();
	return chrome.storage.local.remove(CACHE_KEY);
}

/**
 * Cleans up expired entries from storage.
 * @returns {Promise<void>}
 */
async function cleanupExpiredEntries() {
	chrome.storage.local.get([CACHE_KEY], (data) => {
		/** @type {Record<string, CacheEntry>} */
		const cache = data[CACHE_KEY] || {};
		const now = Date.now();
		let modified = false;

		for (const key in cache) {
			if (cache[key].expires < now) {
				delete cache[key];
				memoryCache.delete(key);
				modified = true;
			}
		}

		if (modified) {
			chrome.storage.local.set({ [CACHE_KEY]: cache });
		}
	});
}
