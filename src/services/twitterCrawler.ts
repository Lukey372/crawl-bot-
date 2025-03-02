import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { TwitterLogger as logger } from '../twitter/Logger';
import fs from 'fs';

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
   * Initializes Puppeteer using the system-installed Chromium.
   * Then sets the auth_token cookie to bypass the login flow.
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
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
    );
    await this.page.setViewport({ width: 1280, height: 800 });

    // Navigate to x.com so the cookie domain is recognized
    await this.page.goto('https://x.com', { waitUntil: 'networkidle2' });

    // Set your auth_token cookie (domain must match x.com)
    logger.info("Setting auth_token cookie");
    await this.page.setCookie({
      name: 'auth_token',
      value: config.twitter.authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: false,
      secure: true
    });

    // Reload the page to apply the cookie
    await this.page.reload({ waitUntil: 'networkidle2' });
    logger.info("Cookie set, page reloaded");
  }

  /**
   * If the auth_token is valid, you're already logged in.
   * If it's invalid or expired, you may get a login prompt.
   */
  async login() {
    if (!this.browser) {
      await this.init();
    }
    if (!this.page) {
      throw new Error("Puppeteer page not initialized");
    }

    logger.info("Checking login state with auth_token...");
    try {
      await this.page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', {
        timeout: 10000
      });
      logger.info("Confirmed logged in via cookie-based session");
    } catch (error) {
      logger.warn("Could not confirm login state. Token may be invalid or expired.");
      throw new Error("auth_token cookie login failed");
    }
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
    // Use the full search URL with additional parameters.
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&src=recent_search_click&f=live`;
    await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Optionally, perform a small scroll to trigger dynamic loading.
    await this.page.evaluate(() => window.scrollBy(0, 500));

    // Increase timeout to 60 seconds.
    try {
      await this.page.waitForSelector('article[data-testid="tweet"]', { timeout: 60000 });
    } catch (error) {
      const html = await this.page.content();
      logger.error("Failed to find tweet elements. Page HTML (first 500 chars):", html.substring(0, 500));
      throw error;
    }

    // Scroll to load additional tweets (optional)
    await this.autoScroll();

    // Extract tweet texts from the page.
    const tweets = await this.page.evaluate(() => {
      const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(tweetElements).map(el => el.textContent || '');
    });

    logger.info(`Found ${tweets.length} tweets`);
    return tweets;
  }

  /**
   * Scrolls the page to load more tweets.
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
