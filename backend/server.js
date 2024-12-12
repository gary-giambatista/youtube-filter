import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
});

app.post("/analyze", async (req, res) => {
	const { titles } = req.body;

	console.log("Titles: ", titles);

	if (!titles || !Array.isArray(titles)) {
		return res.status(400).json({ error: "Invalid request format." });
	}

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
					content: JSON.stringify(titles),
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

		// OpenAI SDK returns a response object; log it to understand its structure
		console.log("OpenAI Response:", response);

		// Assuming the response contains the necessary data
		const results = response.choices[0].message.content; // Adjust based on the actual response structure
		console.log("RESULTS: ", results);
		return res.json({ results });
	} catch (error) {
		console.error("Caught error:", error.message || error);
		res
			.status(500)
			.json({ error: "Internal server error", details: error.message });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
