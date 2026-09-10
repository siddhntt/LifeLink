const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { deviceTokenSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notifications, device tokens, and preferences
 */

router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List user notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification list
 */
router.get('/', asyncHandler(notificationController.listNotifications));

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked read
 */
router.patch('/:id/read', asyncHandler(notificationController.markNotificationRead));

/**
 * @swagger
 * /notifications/device-token:
 *   post:
 *     summary: Register FCM device token
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *               deviceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token registered
 */
router.post('/device-token', validate(deviceTokenSchema), asyncHandler(notificationController.registerToken));

/**
 * @swagger
 * /notifications/device-token:
 *   delete:
 *     summary: Remove FCM device token (logout/device removal)
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Token removed
 */
router.delete('/device-token', asyncHandler(notificationController.removeToken));

/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Current preferences
 */
router.get('/preferences', asyncHandler(notificationController.getPreferences));

/**
 * @swagger
 * /notifications/preferences:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emergencyAlerts:
 *                 type: boolean
 *               appointmentReminders:
 *                 type: boolean
 *               campReminders:
 *                 type: boolean
 *               requestUpdates:
 *                 type: boolean
 *               accountUpdates:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.patch('/preferences', asyncHandler(notificationController.updatePreferences));

module.exports = router;
