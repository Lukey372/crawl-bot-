import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';

/**
 * Locates a valid Chromium/Chrome executable. 
 * Throws an error if none is found.
 */
function findChromiumExecutable(): string {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const fallbackPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable'
  ];

  for (const path of fallbackPaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  throw new Error("No valid Chromium executable found. Please set PUPPETEER_EXECUTABLE_PATH or install Chromium.");
}

export class TwitterCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Initializes Puppeteer with the located Chromium executable.
   */
  private async init() {
    const executablePath = findChromiumExecutable();
    logger.info(`Using Chromium executable at: ${executablePath}`);

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  /**
   * Logs into Twitter (X) using the credentials from configuration.
   * Flow:
   * 1. Navigate to twitter.com and click "Sign in".
   * 2. Enter username, click "Next".
   * 3. Enter password, click "Log in".
   */
  async login() {
    if (!this.browser) {
      await this.init();
    }
    if (!this.page) {
      throw new Error("Puppeteer page not initialized");
    }

    logger.info("Navigating to Twitter home page");
    // Step 1: Open Twitter and click "Sign in"
    await this.page.goto('https://twitter.com/', { waitUntil: 'networkidle2' });
    await this.page.waitForSelector('a[href="/login"]', { visible: true });
    await this.page.click('a[href="/login"]');

    // Step 2: Enter username and click "Next"
    await this.page.waitForSelector('input[name="text"]', { visible: true });
    await this.page.type('input[name="text"]', config.twitter.username, { delay: 50 });

    // Twitter currently reuses the same data-testid for the "Next" and "Log in" buttons
    await this.page.waitForSelector('div[data-testid="LoginForm_Login_Button"]', { visible: true });
    await this.page.click('div[data-testid="LoginForm_Login_Button"]');

    // Step 3: Enter password and click "Log in"
    await this.page.waitForSelector('input[name="password"]', { visible: true });
    await this.page.type('input[name="password"]', config.twitter.password, { delay: 50 });

    await this.page.waitForSelector('div[data-testid="LoginForm_Login_Button"]', { visible: true });
    await this.page.click('div[data-testid="LoginForm_Login_Button"]');

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
