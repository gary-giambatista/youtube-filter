/** @type {string[]} - video titles to be analyzed by ML model */
const videoTitles = [];
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
 * Function to observe the #contents element once it exists.
 */
function waitForContentsElement() {
	const parentContainer = document.querySelector("#content"); // Parent that will always exist
	if (parentContainer) {
		const observer = new MutationObserver(() => {
			const contentsElement = document.querySelector("#contents");
			if (contentsElement) {
				console.log("#contents element found!");
				observer.disconnect(); // Stop observing once #contents is found
				setupContentsObserver(contentsElement); // Call the function to observe #contents
			}
		});

		observer.observe(parentContainer, { childList: true, subtree: true });
		console.log("Waiting for #contents element...");
	} else {
		console.error("Could not find #content parent container to observe.");
	}
}

/**
 * Sets up a MutationObserver on the #contents element to detect new videos.
 * @param {Element} contentsElement
 */
function setupContentsObserver(contentsElement) {
	// TODO: Not really sure why not having the same API loop problem here since we are modifying class names inside of the observer
	const observer = new MutationObserver(() => {
		// 1. Begin extension's functionality
		if (enableNegativityFilter) {
			// Grab all currently loaded video titles from the DOM and mark them as parsed
			document
				.querySelectorAll(
					"ytd-rich-item-renderer:has(#video-title:not(.parsed))"
				)
				.forEach((videoCard) => {
					// TODO: video card can be passed to processVideoTitles to save mapping step
					const titleElement = videoCard.querySelector("#video-title");
					if (titleElement) {
						const title = titleElement.textContent.trim();
						videoTitles.push(title);
						titleElement.classList.add("parsed");
					}
					// Apply filter to Negative Videos on page load
					videoCard.classList.add("yt-neg-filter-on");
				});
		}
		// Hide Shorts on page load if shorts filter enabled
		if (enableShortsFilter) {
			document
				.querySelectorAll("ytd-rich-shelf-renderer")
				.forEach((shortsSection) => {
					shortsSection.classList.add("yt-short-filter-on");
				});
		}

		// TODO: Remove this / directly call processVideoTitles, the 500ms delay is not needed + it can cause double submissions if the initial document.querySelectorAll takes longer than 500ms to finish its loop
		// Trigger debounced processing
		debouncedProcess();
	});

	observer.observe(contentsElement, { childList: true, subtree: true });
	console.log("Observer set up to detect new videos.");
}

// Start observing for the #contents element
waitForContentsElement();

// 2. Debounced version of the process function
const debouncedProcess = debounce(processVideoTitles, 500);

// 3. API call and logic to carry out main function of hiding negative videos
async function processVideoTitles() {
	if (enableNegativityFilter === false) {
		return;
	}
	if (videoTitles.length < 1) {
		return;
	}

	try {
		console.log("Submitting titles to API:", videoTitles);

		/** @type {boolean[]} - results where each boolean represents a video title */
		const negativityResults = await new Promise((resolve, reject) => {
			// Send a message to background.js to call the OpenAI API
			chrome.runtime.sendMessage(
				{ type: "fetchNegativityStatus", titles: videoTitles },
				(response) => {
					if (chrome.runtime.lastError) {
						return reject(chrome.runtime.lastError.message);
					}
					if (response && response.results) {
						console.log("ContentScript Results: ", response.results);
						resolve(response.results);
					} else {
						reject("No results returned from API");
					}
				}
			);
		});

		// Map 1 to 1 with negativityResults, Videos that are parsed, but not yet analyzed
		const nonAnalyzedVideos = document.querySelectorAll(
			"ytd-rich-item-renderer:not(.analyzed):has(#video-title.parsed"
		);

		// Logic to handle hiding negative videos
		videoTitles.forEach((title, index) => {
			const isNegativeVideo = negativityResults[index];
			if (isNegativeVideo) {
				// Hide the video in the DOM
				const negativeVideoCard = nonAnalyzedVideos[index];

				if (negativeVideoCard) {
					console.log("Hiding negative video:", title);
				}
			} else if (!isNegativeVideo) {
				// Remove filter effect on the video
				nonAnalyzedVideos[index].classList.remove("yt-neg-filter-on");
			}
			// Add 'analyzed' class to current video to prevent 1 to 1 mapping (negativityResults -> nonAnalyzedVideos) from being thrown off when new videos are parsed then submitted to OpenAI
			nonAnalyzedVideos[index].classList.add("analyzed");
		});

		// Reset videoTitles in preparation for next videos to be loaded
		videoTitles.length = 0;
	} catch (error) {
		console.error("Error calling OpenAI API:", error);
	}
}

// Utility functions
/**
 * Debounce function to delay execution of a function.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - Time to wait in milliseconds.
 * @returns {Function} - Debounced function.
 */
function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}
