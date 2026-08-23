require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },

  infinitypay: {
    webhookSecret: process.env.INFINITPAY_WEBHOOK_SECRET,
  },

  assinafy: {
    apiKey: process.env.ASSINAFY_API_KEY,
    accountId: process.env.ASSINAFY_ACCOUNT_ID,
    webhookSecret: process.env.ASSINAFY_WEBHOOK_SECRET,
  },

  googleDrive: {
    credentialsPath: process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './credentials.json',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'contratos@nrmax.com.br',
  },

  contract: {
    sequenceStart: parseInt(process.env.CONTRACT_SEQUENCE_START || '1000'),
    prefix: process.env.CONTRACT_PREFIX || 'NRMAX',
    defaultDeliveryDays: parseInt(process.env.DEFAULT_DELIVERY_DAYS || '30'),
  },
};

module.exports = config;
