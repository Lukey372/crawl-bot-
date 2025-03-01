import { config } from './config';
import { logger } from './utils/logger';
import { startServer } from './api/server';
import { TwitterCrawler } from './services/twitterCrawler';

async function main() {
  try {
    // Instantiate the Twitter crawler and perform login
    const twitterCrawler = new TwitterCrawler();
    await twitterCrawler.login();

    // Start the API server
    startServer();

    // Optionally, you can schedule or trigger crawler tasks as needed.
  } catch (error) {
    logger.error("Error during initialization", error);
    process.exit(1);
  }
}

main();
