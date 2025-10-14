// api/generate-summary.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { questionsAndAnswers } = req.body;

    if (!questionsAndAnswers || questionsAndAnswers.length === 0) {
      return res.status(400).json({ error: 'No questions and answers provided.' });
    }

    const contentString = questionsAndAnswers
      .map((qa: { question: string; answer: string }) => `Question: ${qa.question}\nAnswer: ${qa.answer}`)
      .join('\n\n');

    // --- NEW, IMPROVED PROMPT ---
    const prompt = `
      **Role and Goal:** You are a helpful assistant creating a personal summary for a user based on their form responses. Your goal is to rephrase their answers into a cohesive paragraph that they can keep for their records. The tone should be affirmative and reflective.

      **Audience:** The user who just submitted the answers.

      **Instructions:**
      1.  **Use the second person ("You", "Your").** Frame the summary as if you are speaking directly to the user. For example, instead of "The user's goal is...", write "Your main goal is...".
      2.  **Transform answers into a narrative.** Weave the answers together into a smooth, easy-to-read paragraph. Don't just list them.
      3.  **Maintain a strict, summary-only voice.** This is critical.
          - DO NOT provide any advice, opinions, analysis, or conclusions.
          - DO NOT suggest next steps.
          - DO NOT use judgmental or overly enthusiastic language.
      4.  **Start the summary with a clear introductory phrase,** such as "Based on your responses, here is a summary of the key information you provided:"

      **Content to Summarize:**
      ---
      ${contentString}
      ---
    `;

    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    return res.status(200).json({ summary: summaryText });

  } catch (error) {
    console.error("Error generating AI summary:", error);
    return res.status(500).json({ error: 'Failed to generate AI summary.' });
  }
}
