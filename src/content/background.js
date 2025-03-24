/**
 * Call OpenAI API with the video titles.
 * @param {string} title - video titles to process.
 * @returns {Promise<boolean>} - boolean indicating negativity of each title.
 */
async function fetchNegativityStatus(title) {
	try {
		const response = await fetch(
			"https://ytfilter.smallsmallserver.duckdns.org/analyze",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ title }),
			}
		);

		if (response.ok) {
			const result = await response.json();
			console.log("Received backend result:", result);

			// Adjust result handling based on backend response structure
			if (result.result !== undefined) {
				return result.result;
			} else {
				console.error("Backend API returned unexpected result:", result);
				throw new Error("Unexpected backend response");
			}
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

// Listener for messages from contentScript.js to call ML Model API request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("Background.js 1: Received message:", request);
	if (request.type === "fetchNegativityStatus" && request.title) {
		fetchNegativityStatus(request.title)
			.then((result) => {
				console.log("Results from fetchNegativityStatus:", result);
				sendResponse({ result });
			})
			.catch((error) => {
				console.error("Error fetching negativity status:", error);
				sendResponse({ error: "API call failed" });
			});

		return true; // Keep the message channel open for async response
	}
});

// Listen for messages from popup.js (handle user settings updates) -> send to contentScript.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("Background.js 2: Received request", request);
	if (request.userSettings) {
		console.log(
			"Background.js 2: Received user settings",
			request.userSettings
		);

		// Forward updated settings to ONLY YouTube homepage tabs
		chrome.tabs.query({}, (tabs) => {
			tabs.forEach((tab) => {
				if (tab.url === "https://www.youtube.com/") {
					console.log("Background.js 2: Matched Tab(s) sent to: ", tab);
					chrome.tabs.sendMessage(tab.id, {
						userSettings: request.userSettings,
					});
				}
			});
		});
	}
});

// Sync all settings to new tabs when they are created (sync new tabs with latest user settings) -> send to contentScript.js
chrome.tabs.onCreated.addListener((tab) => {
	chrome.storage.local.get("userSettings", (result) => {
		const userSettings = result?.userSettings ?? null;
		if (!userSettings) {
			console.log("Background.js 3: No LS to sync new tab with yet");
		}

		console.log("Background.js 3: Syncing settings to new tab:", userSettings);

		// Send the entire settings object to the new tab
		chrome.tabs.sendMessage(tab.id, { userSettings: userSettings });
	});
});
