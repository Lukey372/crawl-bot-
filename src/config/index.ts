import dotenv from 'dotenv';

dotenv.config();

export const config = {
  twitter: {
    username: process.env.TWITTER_USERNAME || '',
    password: process.env.TWITTER_PASSWORD || ''
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  server: {
    port: Number(process.env.PORT) || 3000
  },
  logLevel: process.env.LOG_LEVEL || 'info'
};
