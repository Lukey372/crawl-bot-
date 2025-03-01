import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TwitterCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  private async init() {
    // Fallback to a common Chromium executable path if PUPPETEER_EXECUTABLE_PATH isn't set.
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  /**
   * Logs into Twitter using the credentials from configuration.
   */
  async login() {
    if (!this.browser) {
      await this.init();
    }
    if (!this.page) {
      throw new Error("Puppeteer page not initialized");
    }

    logger.info("Navigating to Twitter login page");
    await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });
    await this.page.waitForSelector('input[name="text"]');

    // Enter username
    await this.page.type('input[name="text"]', config.twitter.username, { delay: 50 });
    await this.page.click('div[data-testid="LoginForm_Login_Button"],div[role="button"]');

    // Wait briefly before entering the password
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for the password field and enter password
    await this.page.waitForSelector('input[name="password"]', { visible: true });
    await this.page.type('input[name="password"]', config.twitter.password, { delay: 50 });
    await this.page.click('div[data-testid="LoginForm_Login_Button"],div[role="button"]');

    // Wait for navigation after login
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    logger.info("Logged into Twitter successfully");
  }

  /**
   * Searches for tweets based on the given query.
   * @param query - The search query string.
   * @returns An array of tweet text strings.
   */
  async searchTweets(query: string): Promise<string[]> {
    if (!this.page) {
      throw new Error("Puppeteer page not initialized");
    }

    logger.info(`Searching tweets with query: ${query}`);
    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&f=live`;
    await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await this.page.waitForSelector('article');

    // Scroll to load additional tweets
    await this.autoScroll();

    // Extract tweet texts from the page
    const tweets = await this.page.evaluate(() => {
      const tweetElements = document.querySelectorAll('article div[lang]');
      return Array.from(tweetElements).map(el => el.textContent || '');
    });

    logger.info(`Found ${tweets.length} tweets`);
    return tweets;
  }

  /**
   * Automatically scrolls the page to load more tweets.
   */
  private async autoScroll() {
    if (!this.page) return;
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Closes the Puppeteer browser instance.
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info("Browser closed");
    }
  }
}
