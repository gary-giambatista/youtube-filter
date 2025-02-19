/** @type {boolean} - default/intial extension setting to enable/disable the negativity filter */
let enableNegativityFilter = true;
/** @type {boolean} - default/intial extension setting to enable/disable the shorts filter */
let enableShortsFilter = true;

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
	if (setting.name === "negativityFilterToggleState") {
		enableNegativityFilter = setting.enabled;
		console.log(
			`Negativity Filter ${setting.enabled ? "enabled" : "disabled"}`
		);
	}
	if (setting.name === "shortsFilterToggleState") {
		enableShortsFilter = setting.enabled;
		console.log(`Shorts Filter ${setting.enabled ? "enabled" : "disabled"}`);
	}
}

/**
 * 0. Function to observe the #contents element once it exists.
 */
function waitForContentsElement() {
	const parentContainer = document.querySelector("#content"); // Parent that will always exist
	if (parentContainer) {
		const observer = new MutationObserver(() => {
			const contentsElement = document.querySelector("#contents");
			if (contentsElement) {
				console.log("#contents element found!");
				observer.disconnect(); // Stop observing once #contents is found
				setupContentsObserver(contentsElement); // 1. Call the function to observe #contents
			}
		});

		observer.observe(parentContainer, { childList: true, subtree: true });
		console.log("Waiting for #contents element...");
	} else {
		console.error("Could not find #content parent container to observe.");
	}
}

/**
 * 1. Sets up a MutationObserver on the #contents element to detect new videos.
 * @param {Element} contentsElement
 */
function setupContentsObserver(contentsElement) {
	const observer = new MutationObserver((mutationsList) => {
		let newVideosFound = false;

		// Logic to prevent infinite API call loop as mutation listener will re-trigger adding new class names
		mutationsList.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (
					node.nodeType === 1 && // Ensure it's an element
					node.matches?.("ytd-rich-item-renderer:not(.parsed)") // Only new videos
				) {
					newVideosFound = true;
				}
			});
		});

		if (newVideosFound) {
			parseVideoTitles();
		}
	});

	observer.observe(contentsElement, { childList: true, subtree: true });
	console.log("Observer set up to detect new videos.");
}

// 0. Start observing for the #contents element -> 1. setupContentsObserver()
waitForContentsElement();

/**
 * 2. Handle getting the video titles, sending API request to backend and applying the filter on page load. Also handle hiding shorts.
 */
function parseVideoTitles() {
	if (enableNegativityFilter === false) return;

	// 3. Hide Shorts on page load if shorts filter enabled
	hideShorts();

	document
		.querySelectorAll("ytd-rich-item-renderer:not(.parsed)")
		.forEach(async (videoCard) => {
			// Apply filter to Negative Videos on page load - only applies if enableNegativityFilter is true
			videoCard.classList.add("yt-neg-filter-on");

			const titleElement = videoCard.querySelector("#video-title");
			if (titleElement) {
				const title = titleElement.textContent.trim();
				const isNegativeVideo = await processVideoTitle(title); // 4.
				// console.log("isNegativeVideo: ", isNegativeVideo);
				videoCard.classList.add("parsed");
				handleDomActions(videoCard, title, isNegativeVideo); // 5.
			}
		});
}

/**
 * 3. Hides Shorts on page load if shorts filter enabled.
 */
function hideShorts() {
	if (enableShortsFilter === false) return;

	document
		.querySelectorAll("ytd-rich-shelf-renderer:not(.yt-short-filter-on)")
		.forEach((shortsSection) => {
			shortsSection.classList.add("yt-short-filter-on");
		});
}

/**
 * 4. API call to carry out main function of hiding a single negative video
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
					if (response && response.results) {
						// console.log("ContentScript Results: ", response.results);
						// Commented out to reduce console logs after going to 1 call per video
						resolve(response.results.isNegative);
					} else {
						reject("No results returned from API");
					}
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
 * 5. Determines whether to hide or show a video based on the result of the API call (processVideoTitle -> isNegativeVideo).
 * @param {HTMLElement} videoCard - main video card element
 * @param {string} videoTitle - title of the video
 * @param {boolean} isNegativeVideo - result of the API call to processVideoTitle
 */
function handleDomActions(videoCard, videoTitle, isNegativeVideo) {
	if (isNegativeVideo) {
		// Leave the video hidden in the DOM
		console.log("Hiding negative video:", videoTitle);
	} else {
		// Remove filter effect on the video (show the video)
		videoCard.classList.remove("yt-neg-filter-on");
	}
}
