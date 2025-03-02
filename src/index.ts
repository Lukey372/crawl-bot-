import { TwitterPipeline } from './twitter/TwitterPipeline';
import { logger } from './utils/logger';

async function main() {
  try {
    const pipeline = new TwitterPipeline();
    // Replace 'your search query' with the actual query you want to run.
    const result = await pipeline.run('your search query');
    logger.info('Pipeline result:', result);
  } catch (error) {
    logger.error('Error in pipeline', error);
  }
}

main();
