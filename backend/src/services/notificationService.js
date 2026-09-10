const prisma = require('../config/database');
const { sendPushNotification } = require('../config/firebase');

async function registerDeviceToken(userId, token, deviceInfo) {
  return prisma.deviceToken.upsert({
    where: { token },
    update: { userId, deviceInfo, isActive: true, lastUsedAt: new Date() },
    create: { userId, token, deviceInfo },
  });
}

async function removeDeviceToken(token) {
  return prisma.deviceToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

async function getUserTokens(userId) {
  return prisma.deviceToken.findMany({
    where: { userId, isActive: true },
    select: { token: true },
  });
}

async function createNotification(userId, type, title, body, data = {}) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data },
  });

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  const shouldPush = !prefs || prefs[type.toLowerCase()] !== false;

  if (shouldPush) {
    const tokens = await getUserTokens(userId);
    if (tokens.length) {
      await sendPushNotification(
        tokens.map((t) => t.token),
        { title, body },
        { type, ...data }
      );
    }
  }

  return notification;
}

async function getNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  // Query params arrive as strings — coerce to correct types
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const unread = unreadOnly === true || unreadOnly === 'true';

  const where = { userId };
  if (unread) where.isRead = false;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total, page: pageNum, limit: limitNum };
}

async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

async function cleanupInvalidTokens(failedTokens) {
  if (!failedTokens?.length) return;
  await prisma.deviceToken.updateMany({
    where: { token: { in: failedTokens } },
    data: { isActive: false },
  });
}

module.exports = {
  registerDeviceToken,
  removeDeviceToken,
  getUserTokens,
  createNotification,
  getNotifications,
  markAsRead,
  cleanupInvalidTokens,
};
