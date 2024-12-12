/** @type {string[]} - video titles to be analyzed by OpenAI */
const videoTitles = [];

// 1. Observe the "contents" element for when new videos are added by YouTube
const contentsElement = document.querySelector("#contents");
if (contentsElement) {
	const observer = new MutationObserver(() => {
		// Parse ONLY new video titles (non-parsed video titles)
		document
			.querySelectorAll("ytd-rich-item-renderer:has(#video-title:not(.parsed))")
			.forEach((videoCard) => {
				const titleElement = videoCard.querySelector("#video-title");
				if (titleElement) {
					const title = titleElement.textContent.trim();
					videoTitles.push(title);
					titleElement.classList.add("parsed");
				}
			});

		// Trigger debounced processing
		debouncedProcess();
	});

	observer.observe(contentsElement, { childList: true, subtree: true });
	console.log("Observer set up to detect new videos.");
} else {
	console.error("#contents element not found.");
}

// 2. Debounced version of the process function
const debouncedProcess = debounce(processVideoTitles, 500);

// 3.
async function processVideoTitles() {
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
					negativeVideoCard.style.display = "none";
					console.log("Hiding negative video:", title);
				}
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
// 1. Get OpenAI API call working
// 2. Handle Loading state -> videos displayed none, parsed videos display block and parsed but NOT analyzed videos hidden by default with loading overlay, after results, hide negative results with display none
