FROM node:18-bullseye

# Install Chromium and dependencies required by headless Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Optional: Confirm which binary was installed (debug step)
RUN which chromium || which chromium-browser

# Prevent Puppeteer from downloading its own Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Point Puppeteer to the system-installed Chromium
# Adjust to /usr/bin/chromium-browser if that's what you see from the debug step above
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# twitter token
ENV TWITTER_AUTH_TOKEN=90fb7acc05f5c6cc269856baf376b24ce65e28f9

# OpenAI API Key for sentiment analysis (if using ChatGPT)
ENV OPENAI_API_KEY=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

ENV PROTOCOL_TIMEOUT=120000
ENV NAVIGATION_TIMEOUT=120000
ENV DEFAULT_TIMEOUT=120000

EXPOSE 3000

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build
COPY . .
RUN npm run build

# Start the app
CMD ["npm", "start"]
