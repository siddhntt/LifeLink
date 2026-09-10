const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { hospitalSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: Hospital registration, profile, and dashboard
 */

router.use(authenticate);

/**
 * @swagger
 * /hospitals/register:
 *   post:
 *     summary: Register a hospital profile
 *     tags: [Hospitals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, city, state, latitude, longitude, contactPhone, representativeName]
 *             properties:
 *               name:
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
 *               contactPhone:
 *                 type: string
 *               representativeName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hospital registered, pending admin verification
 */
router.post('/register', authorize('HOSPITAL'), validate(hospitalSchema), asyncHandler(hospitalController.registerHospital));

/**
 * @swagger
 * /hospitals/profile:
 *   get:
 *     summary: Get hospital profile
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: Hospital profile data
 */
router.get('/profile', authorize('HOSPITAL'), asyncHandler(hospitalController.getProfile));

/**
 * @swagger
 * /hospitals/profile:
 *   patch:
 *     summary: Update hospital profile
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/profile', authorize('HOSPITAL'), asyncHandler(hospitalController.updateProfile));

/**
 * @swagger
 * /hospitals/dashboard:
 *   get:
 *     summary: Get hospital dashboard (active emergencies, requests, nearby blood banks)
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', authorize('HOSPITAL'), asyncHandler(hospitalController.getDashboard));

module.exports = router;
