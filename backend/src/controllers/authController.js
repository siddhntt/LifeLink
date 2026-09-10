const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { verifyFirebaseToken } = require('../config/firebase');
const { generateToken } = require('../middleware/auth');
const { sendSuccess } = require('../utils/helpers');
const { ROLE_ROUTES } = require('../utils/constants');
const { AppError } = require('../utils/helpers');

const ALLOWED_REGISTER_ROLES = ['DONOR', 'HOSPITAL', 'BLOOD_BANK', 'CAMP_ORGANIZER'];

async function verifyAuth(req, res) {
  const { idToken, role, fullName } = req.body;

  const decoded = await verifyFirebaseToken(idToken);
  const phone = decoded.phone_number || decoded.phone;
  const firebaseUid = decoded.uid;

  if (!phone) throw new AppError('Phone number not found in token', 400, 'INVALID_TOKEN');

  let user = await prisma.user.findUnique({
    where: { firebaseUid },
    include: { donorProfile: true, hospital: true, bloodBank: true, ngo: true },
  });

  // If not found by UID, check if this is a demo account being logged into for the first time
  if (!user) {
    user = await prisma.user.findUnique({
      where: { phone },
      include: { donorProfile: true, hospital: true, bloodBank: true, ngo: true },
    });

    if (user) {
      // Link the new Firebase UID to the existing demo account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid },
        include: { donorProfile: true, hospital: true, bloodBank: true, ngo: true },
      });
    }
  }

  if (!user) {
    if (!role) {
      throw new AppError('Role required for new user registration', 400, 'ROLE_REQUIRED');
    }

    user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        fullName: fullName || null,
        role,
        notificationPrefs: { create: {} },
        ...(role === 'DONOR' && { donorProfile: { create: {} } }),
      },
      include: {
        donorProfile: true,
        hospital: true,
        bloodBank: true,
        ngo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: { role },
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken(user);

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus,
      profileComplete: user.profileComplete,
      redirectTo: ROLE_ROUTES[user.role],
    },
    isNewUser: !user.profileComplete,
  }, 'Authentication successful');
}

async function getMe(req, res) {
  const user = req.user;
  sendSuccess(res, {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
    profileComplete: user.profileComplete,
    donorProfile: user.donorProfile,
    hospital: user.hospital,
    bloodBank: user.bloodBank,
    ngo: user.ngo,
  });
}

async function updateMe(req, res) {
  const { fullName, email } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(fullName && { fullName }),
      ...(email && { email }),
    },
  });
  sendSuccess(res, user, 'Profile updated');
}

async function logout(req, res) {
  const { deviceToken } = req.body || {};

  if (deviceToken) {
    const { removeDeviceToken } = require('../services/notificationService');
    await removeDeviceToken(deviceToken);
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: req.user.id,
    },
  });
  sendSuccess(res, null, 'Logged out successfully');
}

async function emailRegister(req, res) {
  const { fullName, email, password, role } = req.body;

  if (!ALLOWED_REGISTER_ROLES.includes(role)) {
    throw new AppError('Invalid role for public registration', 400, 'INVALID_ROLE');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role,
      notificationPrefs: { create: {} },
      ...(role === 'DONOR' && { donorProfile: { create: {} } }),
    },
    include: { donorProfile: true, hospital: true, bloodBank: true, ngo: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      details: { role, method: 'email' },
    },
  });

  const token = generateToken(user);

  const profileRoutes = {
    DONOR: '/donor/profile',
    HOSPITAL: '/hospital/register',
    BLOOD_BANK: '/blood-bank/register',
    CAMP_ORGANIZER: '/camps/ngo-register',
  };

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus,
      profileComplete: user.profileComplete,
      redirectTo: profileRoutes[role],
    },
    isNewUser: true,
  }, 'Registration successful', 201);
}

async function emailLogin(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { donorProfile: true, hospital: true, bloodBank: true, ngo: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  if (user.accountStatus !== 'ACTIVE') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken(user);

  sendSuccess(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus,
      profileComplete: user.profileComplete,
      redirectTo: ROLE_ROUTES[user.role],
    },
    isNewUser: !user.profileComplete,
  }, 'Login successful');
}

module.exports = { verifyAuth, getMe, updateMe, logout, emailRegister, emailLogin };
