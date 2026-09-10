const express = require('express');
const bloodRequestController = require('../controllers/bloodRequestController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { bloodRequestSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Blood Requests
 *   description: Normal (non-emergency) blood requests by hospitals
 */

router.use(authenticate, authorize('HOSPITAL'));

/**
 * @swagger
 * /blood-requests:
 *   post:
 *     summary: Create a normal blood request
 *     tags: [Blood Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bloodGroup, requiredUnits, requiredBy]
 *             properties:
 *               bloodGroup:
 *                 type: string
 *                 enum: [A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG]
 *               requiredUnits:
 *                 type: integer
 *                 minimum: 1
 *               urgency:
 *                 type: string
 *                 enum: [NORMAL, URGENT, EMERGENCY]
 *               requiredBy:
 *                 type: string
 *                 format: date-time
 *               patientRef:
 *                 type: string
 *               instructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Blood request created
 */
router.post('/', validate(bloodRequestSchema), asyncHandler(bloodRequestController.createBloodRequest));

/**
 * @swagger
 * /blood-requests:
 *   get:
 *     summary: List hospital's blood requests
 *     tags: [Blood Requests]
 *     responses:
 *       200:
 *         description: List of blood requests
 */
router.get('/', asyncHandler(bloodRequestController.getBloodRequests));

/**
 * @swagger
 * /blood-requests/{id}:
 *   get:
 *     summary: Get blood request detail
 *     tags: [Blood Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blood request detail
 */
router.get('/:id', asyncHandler(bloodRequestController.getBloodRequest));

/**
 * @swagger
 * /blood-requests/{id}:
 *   patch:
 *     summary: Update blood request
 *     tags: [Blood Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request updated
 */
router.patch('/:id', asyncHandler(bloodRequestController.updateBloodRequest));

/**
 * @swagger
 * /blood-requests/{id}/cancel:
 *   patch:
 *     summary: Cancel a blood request
 *     tags: [Blood Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request cancelled
 */
router.patch('/:id/cancel', asyncHandler(bloodRequestController.cancelBloodRequest));

module.exports = router;
