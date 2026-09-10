require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  emergency: {
    defaultRadiusKm: parseFloat(process.env.EMERGENCY_DEFAULT_RADIUS_KM) || 5,
    maxRadiusKm: parseFloat(process.env.EMERGENCY_MAX_RADIUS_KM) || 50,
    responseWaitMs: parseInt(process.env.EMERGENCY_RESPONSE_WAIT_MS, 10) || 300000,
    requestExpiryHours: parseInt(process.env.EMERGENCY_REQUEST_EXPIRY_HOURS, 10) || 24,
  },
  scoring: {
    distance: parseFloat(process.env.SCORE_WEIGHT_DISTANCE) || 0.4,
    eligibility: parseFloat(process.env.SCORE_WEIGHT_ELIGIBILITY) || 0.25,
    availability: parseFloat(process.env.SCORE_WEIGHT_AVAILABILITY) || 0.2,
    responseHistory: parseFloat(process.env.SCORE_WEIGHT_RESPONSE_HISTORY) || 0.15,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};
