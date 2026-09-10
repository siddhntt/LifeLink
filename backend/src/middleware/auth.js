const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { AppError } = require('../utils/helpers');

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, phone: user.phone },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        donorProfile: true,
        hospital: true,
        bloodBank: true,
        ngo: true,
      },
    });

    if (!user) throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    if (user.accountStatus !== 'ACTIVE') {
      throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
    }
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  authenticate(req, res, next);
}

module.exports = { generateToken, verifyToken, authenticate, authorize, optionalAuth };
