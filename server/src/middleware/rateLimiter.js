import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests from this device. Please wait a few moments before trying again.',
  },
});

export default apiLimiter;
