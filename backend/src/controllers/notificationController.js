const {
  registerDeviceToken,
  removeDeviceToken,
  getNotifications,
  markAsRead,
} = require('../services/notificationService');
const { sendSuccess } = require('../utils/helpers');
const prisma = require('../config/database');

async function registerToken(req, res) {
  const { token, deviceInfo } = req.body;
  const device = await registerDeviceToken(req.user.id, token, deviceInfo);
  sendSuccess(res, device, 'Device token registered');
}

async function removeToken(req, res) {
  await removeDeviceToken(req.body.token);
  sendSuccess(res, null, 'Device token removed');
}

async function listNotifications(req, res) {
  const result = await getNotifications(req.user.id, req.query);
  sendSuccess(res, result);
}

async function markNotificationRead(req, res) {
  await markAsRead(req.params.id, req.user.id);
  sendSuccess(res, null, 'Notification marked as read');
}

async function updatePreferences(req, res) {
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: req.user.id },
    update: req.body,
    create: { userId: req.user.id, ...req.body },
  });
  sendSuccess(res, prefs, 'Preferences updated');
}

async function getPreferences(req, res) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: req.user.id },
  });
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: req.user.id },
    });
  }
  sendSuccess(res, prefs);
}

module.exports = {
  registerToken,
  removeToken,
  listNotifications,
  markNotificationRead,
  updatePreferences,
  getPreferences,
};
