import { config } from '../config';
import { logger } from '../utils/logger';

interface EngagementMetrics {
  averageLikes: number;
  averageRetweets: number;
  averageReplies: number;
}

interface SentimentResult {
  totalTweetsAnalyzed: number;
  overallSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  promotionalCalls: number;
  verifiedProfiles: number;
  keyTakeaways: string[];
  engagementMetrics: EngagementMetrics;
  dominantThemes: string[];
  confidenceLevel: string;
  tradeSignal: 'Buy' | 'Sell' | 'Hold';
  coinType: 'Memecoin' | 'Utility Coin';
  utilityDescription?: string;
}

/**
 * Removes markdown code block formatting from a string.
 * For example, it strips leading "```json" and trailing "```".
 */
function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/^```(json)?\s*/i, '').replace(/```$/i, '').trim();
}

/**
 * Analyzes the sentiment of provided tweets using the DeepSeek API (DeepSeek-V3 model).
 * @param tweets - Array of tweet texts.
 * @returns An object containing a structured sentiment analysis.
 */
export async function analyzeSentiment(tweets: string[]): Promise<SentimentResult> {
  const prompt = `You are a seasoned analyst with expertise in social media sentiment analysis for crypto tokens. You are especially familiar with both memecoins and utility coins. Memecoins are typically driven by hype and can be extremely volatile, while utility coins have a specific use case or functionality. 

Below is a list of tweets discussing a solana memecoin token. Please analyze these tweets carefully, taking into account the token’s recency, hype cycles, and any potential red flags. Your response must be formatted as a JSON object with the following fields:

- "totalTweetsAnalyzed": The total number of tweets analyzed.
- "overallSentiment": The overall sentiment, which should be one of "Bullish", "Bearish", or "Neutral".
- "promotionalCalls": The number of tweets that appear to be promotional or "shill" tweets.
- "verifiedProfiles": The number of tweets from verified accounts.
- "keyTakeaways": An array of key insights or common themes you observed in the tweets.
- "engagementMetrics": An object with the average number of likes, retweets, and replies per tweet. Use the keys "averageLikes", "averageRetweets", and "averageReplies".
- "dominantThemes": An array of recurring topics or hashtags that are prominent in the tweets.
- "confidenceLevel": A qualitative descriptor ("High", "Medium", or "Low") reflecting how confident you are in your analysis.
- "tradeSignal": A buy/sell recommendation, which should be one of "Buy", "Sell", or "Hold".
- "coinType": A string that indicates whether the token is a "Memecoin" or a "Utility Coin".
- "utilityDescription": If the token is a Utility Coin, provide a brief description of its utility based on the tweets; if it is a Memecoin, this field can be an empty string.

IMPORTANT: Do not include any usage details, system messages, or other metadata in your response. Respond only with the JSON object in the specified format.

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

    // Read the entire response as text.
    const fullResponseText = await response.text();
    logger.info("Full raw response:", fullResponseText);

    // Parse the full response JSON.
    let fullResponse;
    try {
      fullResponse = JSON.parse(fullResponseText);
    } catch (parseError) {
      logger.error("Failed to parse full API response", parseError, fullResponseText);
      throw new Error("Failed to parse full API response");
    }

    // Extract the assistant's message content.
    const messageContent = fullResponse.choices?.[0]?.message?.content;
    if (!messageContent || messageContent.trim() === "") {
      throw new Error("Empty message content from DeepSeek API");
    }

    // Strip markdown formatting if present.
    const content = stripMarkdownCodeBlock(messageContent);

    let result: SentimentResult;
    try {
      result = JSON.parse(content);
    } catch (jsonError) {
      logger.error("Failed to parse JSON from message content", jsonError, content);
      throw new Error("Failed to parse JSON from message content: " + content);
    }
    return result;
  } catch (error) {
    logger.error("Sentiment analysis failed", error);
    throw error;
  }
}
