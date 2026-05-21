import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),
  API_URL: Joi.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // LINE
  LINE_CHANNEL_ID: Joi.string().allow('').default(''),
  LINE_CHANNEL_SECRET: Joi.string().allow('').default(''),
  LINE_CHANNEL_ACCESS_TOKEN: Joi.string().allow('').default(''),
  LINE_LOGIN_CHANNEL_ID: Joi.string().allow('').default(''),
  LINE_LOGIN_CHANNEL_SECRET: Joi.string().allow('').default(''),
  LINE_LOGIN_CALLBACK_URL: Joi.string().allow('').default(''),
  LIFF_ID: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().default('default-secret-change-me'),
  JWT_EXPIRATION: Joi.number().default(3600),

  // QR
  QR_HMAC_SECRET: Joi.string().default('default-qr-hmac-secret'),
  QR_TOKEN_EXPIRY_MINUTES: Joi.number().default(5),
});
