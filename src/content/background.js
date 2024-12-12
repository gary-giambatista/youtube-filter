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
			console.log("Received backend result:", result);

			// Adjust result handling based on backend response structure
			return result.results || []; // Fallback to an empty array if results key is missing
		} else {
			const errorMessage = await response.text();
			console.error("Backend API Error:", errorMessage);
			throw new Error(errorMessage);
		}
	} catch (error) {
		console.error("Error calling backend API:", error);
		return null;
	}
}

// Listener for messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("Received message:", request);
	if (request.type === "fetchNegativityStatus" && request.titles) {
		fetchNegativityStatus(request.titles)
			.then((results) => {
				console.log("Results from fetchNegativityStatus:", results);
				sendResponse({ results });
			})
			.catch((error) => {
				console.error("Error fetching negativity status:", error);
				sendResponse({ error: "API call failed" });
			});

		return true; // Keep the message channel open for async response
	}
});
