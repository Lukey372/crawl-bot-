import dotenv from 'dotenv';

dotenv.config();

export const config = {
  twitter: {
    username: process.env.TWITTER_USERNAME || '',
    password: process.env.TWITTER_PASSWORD || '',
    authToken: process.env.TWITTER_AUTH_TOKEN || '',
    // Added timeout settings (in milliseconds)
    protocolTimeout: Number(process.env.PROTOCOL_TIMEOUT) || 120000,
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT) || 120000,
    defaultTimeout: Number(process.env.DEFAULT_TIMEOUT) || 120000,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
