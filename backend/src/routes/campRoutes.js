const express = require('express');
const campController = require('../controllers/campController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { ngoSchema, campSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Camps
 *   description: Donation camp management, registration, and QR check-in
 */

/**
 * @swagger
 * /camps:
 *   get:
 *     summary: List upcoming approved donation camps
 *     tags: [Camps]
 *     security: []
 *     responses:
 *       200:
 *         description: List of camps
 */
router.get('/', asyncHandler(campController.listCamps));

/**
 * @swagger
 * /camps/{id}:
 *   get:
 *     summary: Get camp detail
 *     tags: [Camps]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Camp detail with registrations
 */
router.get('/:id', asyncHandler(campController.getCamp));

/**
 * @swagger
 * /camps/{id}/register:
 *   post:
 *     summary: Donor registers for a camp
 *     tags: [Camps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Registered
 */
router.post('/:id/register', authenticate, authorize('DONOR'), asyncHandler(campController.registerForCamp));

/**
 * @swagger
 * /camps/check-in:
 *   post:
 *     summary: QR-based camp check-in
 *     tags: [Camps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrCode]
 *             properties:
 *               qrCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checked in
 */
router.post('/check-in', authenticate, authorize('DONOR'), asyncHandler(campController.checkInCamp));

/**
 * @swagger
 * /camps/manage:
 *   post:
 *     summary: Create a donation camp (blood bank or NGO)
 *     tags: [Camps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date, startTime, endTime, address, city, state, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               capacity:
 *                 type: integer
 *                 default: 100
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Camp created
 */
router.post('/manage', authenticate, authorize('BLOOD_BANK', 'CAMP_ORGANIZER'), validate(campSchema), asyncHandler(campController.createCamp));

/**
 * @swagger
 * /camps/ngo/register:
 *   post:
 *     summary: Register NGO profile
 *     tags: [Camps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, city, state, contactPhone, representativeName]
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               representativeName:
 *                 type: string
 *     responses:
 *       201:
 *         description: NGO registered
 */
router.post('/ngo/register', authenticate, authorize('CAMP_ORGANIZER'), validate(ngoSchema), asyncHandler(campController.registerNGO));

module.exports = router;
