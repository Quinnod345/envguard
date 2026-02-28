const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;
const port = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;
const nodeEnv = process.env.NODE_ENV ?? 'development';
const redisUrl = process.env['REDIS_URL'];
