console.log("contentScript read!");

// Initialize an array to store video titles
const videoTitles = [];

/**
 * Function to extract video titles
 */
function parseVideoTitles() {
	document
		.querySelectorAll("ytd-rich-item-renderer:has(#video-title:not(.parsed))")
		.forEach((videoCard) => {
			const titleElement = videoCard.querySelector("#video-title");
			if (titleElement) {
				videoTitles.push(titleElement.textContent.trim());
				console.log("Parsed video title:", titleElement.textContent.trim());

				// Mark as parsed to avoid duplication
				titleElement.classList.add("parsed");
			}
		});
}

// Observe the "contents" element for changes (new videos being loaded)
const contentsElement = document.querySelector("#contents");
if (contentsElement) {
	const observer = new MutationObserver(() => {
		parseVideoTitles();
	});

	// Start observing for child elements being added or subtree modifications
	observer.observe(contentsElement, {
		childList: true,
		subtree: true,
	});

	console.log("Observer set up to watch for new video recommendations.");
} else {
	console.error(
		"#contents element not found. Make sure you're on a YouTube page."
	);
}
