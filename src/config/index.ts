import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let openaiApiKey = process.env.OPENAI_API_KEY || '';

if (!openaiApiKey) {
  try {
    openaiApiKey = fs.readFileSync('/etc/secrets/OPENAI_API_KEY', 'utf8').trim();
  } catch (error) {
    console.error('Failed to load OpenAI API key from /etc/secrets/OPENAI_API_KEY', error);
  }
}

export const config = {
  twitter: {
    username: process.env.TWITTER_USERNAME || '',
    password: process.env.TWITTER_PASSWORD || '',
    authToken: process.env.TWITTER_AUTH_TOKEN || '',
  },
  openai: {
    apiKey: openaiApiKey,
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
