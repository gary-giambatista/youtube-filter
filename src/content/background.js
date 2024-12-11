import OpenAI from "openai";
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
});

/**
 * Call OpenAI API with the video titles.
 * @param {string[]} titles - Array of video titles to process.
 * @returns {Promise<boolean[]>} - Array of booleans indicating negativity of each title.
 */
async function fetchNegativityStatus(titles) {
	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a moderator for text inputs which represent the title of YouTube videos. Your task is to determine if the video titles are negative or not negative. You will receive a JavaScript array of strings which represent video titles and it is your task to return a JavaScript array of booleans, where the boolean value of that index is determined by the video title's context; if it is a negative context please return true for that index, if it is not negative please return false. The array of booleans returned should match the length of the array of strings submitted.",
				},
				{
					role: "user",
					content: titles,
				},
			],
			response_format: {
				type: "text",
			},
			temperature: 1,
			max_tokens: 500,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
		});

		if (response.ok) {
			const results = await response.json();
			return results; // Adjust this based on your API's response
		} else {
			console.error("OpenAI API Error:", await response.text());
			return null;
		}
	} catch (error) {
		console.error("Error while calling OpenAI API:", error);
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
