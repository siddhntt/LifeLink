const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { emergencyRequestSchema, donorResponseSchema, donorStatusUpdateSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Emergency Requests
 *   description: Emergency blood request lifecycle and donor response
 */

router.use(authenticate);

/**
 * @swagger
 * /emergency-requests:
 *   post:
 *     summary: Create emergency blood request (verified hospitals only)
 *     tags: [Emergency Requests]
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
 *                 maximum: 20
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
 *         description: Emergency request created, donor search started
 *       403:
 *         description: Hospital not verified
 */
router.post('/', authorize('HOSPITAL'), validate(emergencyRequestSchema), asyncHandler(hospitalController.createEmergencyRequest));

/**
 * @swagger
 * /emergency-requests:
 *   get:
 *     summary: List emergency requests
 *     tags: [Emergency Requests]
 *     responses:
 *       200:
 *         description: List of emergency requests with donor responses
 */
router.get('/', authorize('HOSPITAL', 'ADMIN'), asyncHandler(hospitalController.getEmergencyRequests));

/**
 * @swagger
 * /emergency-requests/{id}:
 *   get:
 *     summary: Get emergency request detail
 *     tags: [Emergency Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Emergency request with donor responses and radius logs
 */
router.get('/:id', authorize('HOSPITAL', 'ADMIN', 'DONOR'), asyncHandler(hospitalController.getEmergencyRequest));

/**
 * @swagger
 * /emergency-requests/{id}/cancel:
 *   patch:
 *     summary: Cancel an emergency request
 *     tags: [Emergency Requests]
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
router.patch('/:id/cancel', authorize('HOSPITAL'), asyncHandler(hospitalController.cancelEmergencyRequest));

/**
 * @swagger
 * /emergency-requests/{id}/respond:
 *   post:
 *     summary: Donor responds to emergency (accept/reject)
 *     tags: [Emergency Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *     responses:
 *       200:
 *         description: Response recorded
 */
router.post('/:id/respond', authorize('DONOR'), validate(donorResponseSchema), asyncHandler(hospitalController.respondToEmergency));

/**
 * @swagger
 * /emergency-requests/{id}/responses/{responseId}:
 *   patch:
 *     summary: Hospital updates donor status (ARRIVED / DONATION_COMPLETED)
 *     tags: [Emergency Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ARRIVED, DONATION_COMPLETED]
 *     responses:
 *       200:
 *         description: Donor status updated
 */
router.patch('/:id/responses/:responseId', authorize('HOSPITAL'), validate(donorStatusUpdateSchema), asyncHandler(hospitalController.updateDonorResponseStatus));

/**
 * @swagger
 * /emergency-requests/{id}/donor-location:
 *   get:
 *     summary: Get last known donor location for a hospital (snapshot on page load)
 *     tags: [Emergency Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Last known donor location or null
 */
router.get('/:id/donor-location', authorize('HOSPITAL', 'ADMIN'), asyncHandler(async (req, res) => {
  const { sendSuccess } = require('../utils/helpers');
  const prisma = require('../config/database');
  const { AppError } = require('../utils/helpers');

  const request = await prisma.emergencyRequest.findUnique({
    where: { id: req.params.id },
    select: { hospitalId: true, status: true },
  });
  if (!request) throw new AppError('Emergency request not found', 404, 'NOT_FOUND');

  // Only the hospital that owns the request can see location
  if (req.user.role === 'HOSPITAL') {
    const hospital = await prisma.hospital.findUnique({ where: { userId: req.user.id } });
    if (!hospital || hospital.id !== request.hospitalId) {
      throw new AppError('Not authorized to view this request', 403, 'FORBIDDEN');
    }
  }

  const locations = await prisma.donorLiveLocation.findMany({
    where: { emergencyRequestId: req.params.id },
    include: {
      donorProfile: {
        select: { id: true, user: { select: { fullName: true } } },
      },
    },
  });

  sendSuccess(res, { locations });
}));

module.exports = router;
