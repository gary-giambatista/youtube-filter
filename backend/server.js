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
	const { title } = req.body;

	console.log("req.body: ", req.body);
	// console.log("Titles: ", title);

	if (!title || typeof title !== "string") {
		return res
			.status(400)
			.json({ error: "Invalid request format. Please submit 1 string" });
	}

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"Return true if the text has a negative context, otherwise return false.",
				},
				{
					role: "user",
					content: title,
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "VideoTitlePositivity",
					schema: {
						type: "object",
						properties: {
							isNegative: {
								type: "boolean",
							},
						},
						required: ["isNegative"],
					},
				},
			},
			temperature: 0,
			max_tokens: 10,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
		});

		// OpenAI SDK returns a response object; log it to understand its structure
		console.log("OpenAI Response:", response);

		const rawContent = response.choices[0].message.content;

		try {
			const results = JSON.parse(rawContent);
			console.log("RESULTS: ", results);
			return res.json({ results });
		} catch (parseError) {
			console.error(
				"Error parsing OpenAI response:",
				parseError,
				"Raw content:",
				rawContent
			);
			res.status(500).json({ error: "Invalid response from OpenAI" });
		}
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
