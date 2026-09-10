const express = require('express');
const campController = require('../controllers/campController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { appointmentSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Donor appointment booking and management
 */

router.use(authenticate);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a donation appointment
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId]
 *             properties:
 *               slotId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment booked
 *       400:
 *         description: Slot full or already booked
 */
router.post('/', authorize('DONOR'), validate(appointmentSchema), asyncHandler(campController.bookAppointmentHandler));

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Get appointments (donor sees own, blood bank sees theirs)
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/', authorize('DONOR', 'BLOOD_BANK'), asyncHandler(campController.getAppointments));

/**
 * @swagger
 * /appointments/{id}:
 *   patch:
 *     summary: Update appointment status (blood bank confirms/rejects/completes)
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, REJECTED, COMPLETED, CANCELLED, NO_SHOW]
 *     responses:
 *       200:
 *         description: Appointment updated
 */
router.patch('/:id', authorize('BLOOD_BANK'), asyncHandler(campController.updateAppointment));

module.exports = router;
