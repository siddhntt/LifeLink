const express = require('express');
const donorController = require('../controllers/donorController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { donorProfileSchema, availabilitySchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Donors
 *   description: Donor profile, eligibility, availability, and history
 */

router.use(authenticate, authorize('DONOR'));

/**
 * @swagger
 * /donors/dashboard:
 *   get:
 *     summary: Get donor dashboard data
 *     tags: [Donors]
 *     responses:
 *       200:
 *         description: Dashboard with eligibility, appointments, nearby camps, history
 */
router.get('/dashboard', asyncHandler(donorController.getDashboard));

/**
 * @swagger
 * /donors/profile:
 *   get:
 *     summary: Get donor profile with eligibility evaluation
 *     tags: [Donors]
 *     responses:
 *       200:
 *         description: Donor profile data
 */
router.get('/profile', asyncHandler(donorController.getProfile));

/**
 * @swagger
 * /donors/profile:
 *   patch:
 *     summary: Update donor profile
 *     tags: [Donors]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bloodGroup:
 *                 type: string
 *                 enum: [A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               weight:
 *                 type: number
 *               city:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/profile', validate(donorProfileSchema), asyncHandler(donorController.updateProfile));

/**
 * @swagger
 * /donors/availability:
 *   patch:
 *     summary: Toggle donor availability
 *     tags: [Donors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [availability]
 *             properties:
 *               availability:
 *                 type: string
 *                 enum: [AVAILABLE, NOT_AVAILABLE]
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.patch('/availability', validate(availabilitySchema), asyncHandler(donorController.updateAvailability));

/**
 * @swagger
 * /donors/history:
 *   get:
 *     summary: Get donor donation history
 *     tags: [Donors]
 *     responses:
 *       200:
 *         description: List of donations
 */
router.get('/history', asyncHandler(donorController.getHistory));

module.exports = router;
