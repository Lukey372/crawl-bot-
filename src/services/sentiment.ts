import { config } from '../config';
import { logger } from '../utils/logger';

interface SentimentResult {
  totalTweetsAnalyzed: number;
  overallSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  promotionalCalls: number;
  verifiedProfiles: number;
  keyTakeaways: string[];
}

/**
 * Analyzes the sentiment of provided tweets using the ChatGPT API.
 * @param tweets - Array of tweet texts.
 * @returns An object containing a structured sentiment analysis.
 */
export async function analyzeSentiment(tweets: string[]): Promise<SentimentResult> {
  const prompt = `You are a seasoned analyst with expertise in social media sentiment for crypto tokens. Below is a list of tweets discussing a crypto token. Please analyze these tweets and provide a detailed sentiment summary. Your response must be formatted as a JSON object with the following fields:

- "totalTweetsAnalyzed": The total number of tweets analyzed.
- "overallSentiment": The overall sentiment, which should be one of "Bullish", "Bearish", or "Neutral".
- "promotionalCalls": The number of tweets that appear to be promotional or "shill" tweets.
- "verifiedProfiles": The number of tweets from verified accounts.
- "keyTakeaways": An array of key insights or common themes you observed in the tweets.

Respond only with the JSON object in the specified format.

Tweets:
${tweets.join('\n')}
`;

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
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error in OpenAI API response", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    logger.info("Raw sentiment response:", content);

    if (!content || content.trim() === "") {
      throw new Error("Empty response from OpenAI API");
    }

    let result: SentimentResult;
    try {
      result = JSON.parse(content);
    } catch (jsonError) {
      logger.error("Failed to parse JSON response", jsonError);
      throw new Error("Failed to parse JSON response: " + content);
    }
    return result;
  } catch (error) {
    logger.error("Sentiment analysis failed", error);
    throw error;
  }
}
