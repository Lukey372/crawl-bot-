import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';

/**
 * Checks common paths or an environment variable for a Chromium/Chrome executable.
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
   *   1. Navigate to twitter.com and click "Sign in".
   *   2. Enter username, click "Next".
   *   3. Enter password, click "Log in".
   */
  async login() {
    if (!this.browser) {
      await this.init();
    }
    if (!this.page) {
      throw new Error("Puppeteer page not initialized");
    }

    logger.info("Navigating to Twitter home page");
    await this.page.goto('https://twitter.com/', { waitUntil: 'networkidle2' });

    // STEP 1: Click "Sign in"
    logger.info("Clicking 'Sign in'");
    await this.page.waitForSelector('a[href="/login"]', { visible: true, timeout: 15000 });
    await this.page.click('a[href="/login"]');

    // STEP 2: Enter username and click "Next"
    logger.info("Entering username");
    await this.page.waitForSelector('input[name="text"]', { visible: true, timeout: 30000 });
    await this.page.type('input[name="text"]', config.twitter.username, { delay: 50 });

    logger.info("Clicking 'Next'");
    const [nextBtn] = await this.page.$x("//span[contains(text(),'Next')]/ancestor::div[@role='button']");
    if (!nextBtn) {
      throw new Error("Next button not found via XPath. UI may have changed.");
    }
    await nextBtn.click();

    // STEP 3: Enter password and click "Log in"
    logger.info("Entering password");
    await this.page.waitForSelector('input[name="password"]', { visible: true, timeout: 30000 });
    await this.page.type('input[name="password"]', config.twitter.password, { delay: 50 });

    logger.info("Clicking 'Log in'");
    const [loginBtn] = await this.page.$x("//span[contains(text(),'Log in')]/ancestor::div[@role='button']");
    if (!loginBtn) {
      throw new Error("Log in button not found via XPath. UI may have changed.");
    }
    await loginBtn.click();

    // Wait for navigation after login
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
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
