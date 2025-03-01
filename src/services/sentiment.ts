import { config } from '../config';
import { logger } from '../utils/logger';

interface SentimentResult {
  sentiment: string;
  summary: string;
}

/**
 * Analyzes the sentiment of provided tweets using the ChatGPT API.
 * @param tweets - Array of tweet texts.
 * @returns An object containing overall sentiment and a summary.
 */
export async function analyzeSentiment(tweets: string[]): Promise<SentimentResult> {
  const prompt = `Analyze the sentiment of the following tweets and provide a summary.
Tweets:
${tweets.join('\n')}
Respond with a JSON object containing "sentiment" (bullish, bearish, or neutral) and "summary".`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error in OpenAI API response", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    const data = await response.json();
    const content = data.choices[0].message.content;
    // Expecting the content to be a valid JSON string
    const result: SentimentResult = JSON.parse(content);
    return result;
  } catch (error) {
    logger.error("Sentiment analysis failed", error);
    throw error;
  }
}
