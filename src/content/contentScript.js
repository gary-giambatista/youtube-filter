/** @type {string[]} - video titles to be analyzed by OpenAI */
const videoTitles = [];
/** @type {boolean} - setting to enable/disable the negativity filter */
let disableNegativityFilter = false;

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
	const observer = new MutationObserver(() => {
		document
			.querySelectorAll("ytd-rich-item-renderer:has(#video-title:not(.parsed))")
			.forEach((videoCard) => {
				const titleElement = videoCard.querySelector("#video-title");
				if (titleElement) {
					const title = titleElement.textContent.trim();
					videoTitles.push(title);
					titleElement.classList.add("parsed");
				}
				// Hide Videos by default if negativity filter enabled
				if (!disableNegativityFilter) {
					videoCard.classList.add("yt-neg-filter-on");
				}
			});

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

// 3.
async function processVideoTitles() {
	if (disableNegativityFilter) {
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

// Todo:
// 1. Implement setting and functionality for hiding shorts
// 2. Add setting to enable/disable shorts

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.negativityFilterToggleState !== undefined) {
		if (request.negativityFilterToggleState) {
			console.log("Negativity Filter enabled");
			disableNegativityFilter = false;
		} else {
			console.log("Negativity Filter disabled");
			disableNegativityFilter = true;
		}
	}
});

// Get initial toggle state when the content script is loaded
chrome.storage.local.get("negativityFilterToggleState", (result) => {
	if (result.negativityFilterToggleState !== undefined) {
		if (result.negativityFilterToggleState) {
			console.log("Initial Load: negativity filter enabled");
			disableNegativityFilter = false;
		} else {
			console.log("Initial Load: negativity filter disabled");
			disableNegativityFilter = true;
		}
	}
});
