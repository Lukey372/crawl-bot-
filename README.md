# Crawl Bot

A Twitter crawler bot built with Puppeteer and Express. This bot logs into Twitter, scrapes tweets based on a search query, and performs sentiment analysis via OpenAI's GPT-4 API. The results are exposed via a RESTful API for integration with your calls bot.

## Features

- **Twitter Crawling:** Logs into Twitter and scrapes live tweet data using Puppeteer.
- **Sentiment Analysis:** Processes tweet data with ChatGPT-4 to determine overall sentiment (bullish, bearish, or neutral) and generate a summary.
- **API Integration:** Provides an Express-based API to trigger crawling and retrieve sentiment analysis results.
- **Environment Driven:** Configurable via environment variables for credentials, server settings, and logging.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/crawl-bot.git
   cd crawl-bot
