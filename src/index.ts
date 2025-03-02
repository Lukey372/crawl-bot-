import { TwitterPipeline } from './twitter/TwitterPipeline';
import { startServer } from './api/server';
import { logger } from './utils/logger';

async function main() {
  try {
    // Start the API server
    startServer();

    // Run your Twitter pipeline process
    const pipeline = new TwitterPipeline();
    const result = await pipeline.run('your search query');
    logger.info('Pipeline result:', result);
  } catch (error) {
    logger.error('Error in pipeline', error);
  }
}

main();
