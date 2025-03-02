import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';

function findChromiumExecutable(): string {
  // Check if an executable path was provided via environment variable.
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  // Define a list of common fallback paths.
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

  private async init() {
    const executablePath = findChromiumExecutable();
    logger.info(`Using Chromium executable at: ${executablePath}`);

    this.browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    // Set a realistic user agent.
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
    );
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  /**
   * Logs into Twitter (X) using the credentials from configuration.
   * This implementation uses the direct login URL and the legacy session selectors.
   * Flow:
   *   1. Navigate to https://twitter.com/login.
   *   2. Enter username and password.
   *   3. Click the "Log in" button.
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

    // Wait for the username field.
    logger.info("Waiting for username field");
    await this.page.waitForSelector('input[name="session[username_or_email]"]', { visible: true, timeout: 30000 });
    logger.info("Entering username");
    await this.page.type('input[name="session[username_or_email]"]', config.twitter.username, { delay: 50 });

    // Wait for the password field.
    logger.info("Waiting for password field");
    await this.page.waitForSelector('input[name="session[password]"]', { visible: true, timeout: 30000 });
    logger.info("Entering password");
    await this.page.type('input[name="session[password]"]', config.twitter.password, { delay: 50 });

    // Click the login button.
    logger.info("Clicking 'Log in'");
    await this.page.waitForSelector('div[data-testid="LoginForm_Login_Button"]', { visible: true, timeout: 10000 });
    await this.page.click('div[data-testid="LoginForm_Login_Button"]');

    // Wait for navigation after login.
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

    // Scroll to load additional tweets.
    await this.autoScroll();

    // Extract tweet texts from the page.
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
