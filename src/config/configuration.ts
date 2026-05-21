export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  line: {
    channelId: process.env.LINE_CHANNEL_ID,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    loginChannelId: process.env.LINE_LOGIN_CHANNEL_ID,
    loginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    loginCallbackUrl: process.env.LINE_LOGIN_CALLBACK_URL,
    liffId: process.env.LIFF_ID,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
  },

  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET || 'default-qr-hmac-secret',
    tokenExpiryMinutes: parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES || '5', 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
