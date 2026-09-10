const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard, user management, verification, and moderation
 */

router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin analytics dashboard
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Platform statistics and analytics
 */
router.get('/dashboard', asyncHandler(adminController.getDashboard));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users with optional filters
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/users', asyncHandler(adminController.getUsers));

/**
 * @swagger
 * /admin/users/{id}:
 *   patch:
 *     summary: Update user account status (activate/deactivate/suspend)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/users/:id', asyncHandler(adminController.updateUser));

/**
 * @swagger
 * /admin/verification:
 *   get:
 *     summary: Get pending hospital/blood-bank/NGO verifications
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Pending verifications
 */
router.get('/verification', asyncHandler(adminController.getPendingVerifications));

/**
 * @swagger
 * /admin/hospitals/{id}/verify:
 *   patch:
 *     summary: Verify or reject a hospital
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hospital verification updated
 */
router.patch('/hospitals/:id/verify', asyncHandler(adminController.verifyHospital));

/**
 * @swagger
 * /admin/blood-banks/{id}/verify:
 *   patch:
 *     summary: Verify or reject a blood bank
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blood bank verification updated
 */
router.patch('/blood-banks/:id/verify', asyncHandler(adminController.verifyBloodBank));

/**
 * @swagger
 * /admin/ngos/{id}/verify:
 *   patch:
 *     summary: Verify or reject an NGO
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: NGO verification updated
 */
router.patch('/ngos/:id/verify', asyncHandler(adminController.verifyNGO));

/**
 * @swagger
 * /admin/camps/{id}/approve:
 *   patch:
 *     summary: Approve or reject a donation camp
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Camp approved
 */
router.patch('/camps/:id/approve', asyncHandler(adminController.approveCamp));

/**
 * @swagger
 * /admin/emergencies/flagged:
 *   get:
 *     summary: Get emergency requests flagged for review (possible duplicates)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Flagged emergency requests
 */
router.get('/emergencies/flagged', asyncHandler(adminController.getFlaggedEmergencies));

/**
 * @swagger
 * /admin/emergencies/{id}/clear-flag:
 *   patch:
 *     summary: Clear duplicate flag on an emergency request
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flag cleared
 */
router.patch('/emergencies/:id/clear-flag', asyncHandler(adminController.clearEmergencyFlag));

module.exports = router;
