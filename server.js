require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const SYSTEM_PROMPT = `You are cyber security assistant that is going to receive a code file that a developer is currently writing in a text format now your main task to find the vulnerabilities in this code. You have to rate how safe this code from a range of 1 to 100 and find the vulnerabilities and tell what can go wrong if this code is shipped or deployed and give suggestions to the developer on how to improve the code. Send the errors in a text manner and the rating will be at the top and tell on which line or part of code is the vulnerability present`;
const PORT = process.env.PORT;

app.post("/claude", async (req, res) => {
  try {
    const { codeTexts } = req.body;
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: "claude-3-haiku-20240307",
        system: SYSTEM_PROMPT,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `This is the Code ${codeTexts} give the vulnerabilities`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.log("Error in Server while Getting Data from Claude API");
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => console.log("Server ready on port 3000"));

module.exports = app;
