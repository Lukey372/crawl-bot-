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
 * Removes markdown code block formatting from a string.
 * For example, it strips leading "```json" and trailing "```".
 */
function stripMarkdownCodeBlock(text: string): string {
  // Remove starting and ending code block markers if present.
  return text.replace(/^```(json)?\s*/i, '').replace(/```$/i, '').trim();
}

/**
 * Analyzes the sentiment of provided tweets using the DeepSeek API (DeepSeek-V3 model).
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
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Error in DeepSeek API response", errorText);
      throw new Error(`DeepSeek API error: ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    logger.info("Raw sentiment response:", content);

    if (!content || content.trim() === "") {
      throw new Error("Empty response from DeepSeek API");
    }

    // Strip markdown formatting if present.
    content = stripMarkdownCodeBlock(content);

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
