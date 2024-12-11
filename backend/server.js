const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

import OpenAI from "openai";
const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
});

app.post("/analyze", async (req, res) => {
	const { titles } = req.body;

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

		if (!response.ok) {
			throw new Error("OpenAI API error");
		}

		if (response.ok) {
			const results = await response.json();
			return res.json(results); // Adjust this based on your API's response
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
