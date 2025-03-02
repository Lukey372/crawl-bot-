import express, { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TwitterCrawler } from '../services/twitterCrawler';
import { analyzeSentiment } from '../services/sentiment';

const app = express();

app.use(express.json());

/**
 * Endpoint to check server status.
 */
app.get('/status', (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * Endpoint to trigger Twitter crawling and sentiment analysis.
 * Expects a JSON payload with a "query" field.
 */
app.post('/crawl', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const twitterCrawler = new TwitterCrawler();
    await twitterCrawler.login();
    const tweets = await twitterCrawler.searchTweets(query);
    const sentiment = await analyzeSentiment(tweets);
    await twitterCrawler.close();

    res.json({ tweetsCount: tweets.length, sentiment });
  } catch (error) {
    logger.error("Error during crawl", error);
    res.status(500).json({ error: "Crawling failed" });
  }
});

/**
 * Starts the API server on the configured port.
 */
export function startServer() {
  app.listen(config.server.port, '0.0.0.0', () => {
    logger.info(`Server listening on port ${config.server.port}`);
  });
}
