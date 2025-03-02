import { TwitterCrawler } from '../services/twitterCrawler';
import { TwitterLogger } from './Logger';
import { TweetFilter } from './TweetFilter';
import { DataOrganizer } from './DataOrganizer';

export class TwitterPipeline {
  private crawler: TwitterCrawler;

  constructor() {
    this.crawler = new TwitterCrawler();
  }

  async run(query: string): Promise<any> {
    try {
      TwitterLogger.info('Starting Twitter pipeline');
      await this.crawler.login();
      TwitterLogger.info('Login complete');
      const tweets = await this.crawler.searchTweets(query);
      TwitterLogger.info('Tweets scraped', tweets.length);
      const filteredTweets = TweetFilter.filter(tweets);
      TwitterLogger.info('Tweets after filtering', filteredTweets.length);
      const organizedData = DataOrganizer.organize(filteredTweets);
      TwitterLogger.info('Data organized', organizedData.count);
      return organizedData;
    } catch (error) {
      TwitterLogger.error('Pipeline failed', error);
      throw error;
    } finally {
      await this.crawler.close();
    }
  }
}
