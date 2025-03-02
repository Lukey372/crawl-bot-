export class TweetFilter {
  // Example: remove tweets that are too short or contain unwanted content.
  static filter(tweets: string[]): string[] {
    return tweets.filter(tweet => tweet.length > 10);
  }
}
