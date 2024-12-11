/**
 * Call OpenAI API with the video titles.
 * @param {string[]} titles - Array of video titles to process.
 * @returns {Promise<boolean[]>} - Array of booleans indicating negativity of each title.
 */
async function fetchNegativityStatus(titles) {
	try {
		const response = await fetch("http://localhost:3000/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ titles }),
		});

		if (response.ok) {
			const result = await response.json();
			return result.data; // Adjust based on your backend response
		} else {
			console.error("Backend API Error:", await response.text());
			return null;
		}
	} catch (error) {
		console.error("Error calling backend API:", error);
		return null;
	}
}

// Listener for messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "fetchNegativityStatus" && request.titles) {
		fetchNegativityStatus(request.titles)
			.then((results) => sendResponse({ results }))
			.catch((error) => {
				console.error("Error fetching negativity status:", error);
				sendResponse({ error: "API call failed" });
			});

		// Required to indicate asynchronous response
		return true;
	}
});
