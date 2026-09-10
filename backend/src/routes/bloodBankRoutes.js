const express = require('express');
const bloodBankController = require('../controllers/bloodBankController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { bloodBankSchema, inventorySchema, inventoryUpdateSchema, donationRecordSchema, slotSchema, bloodSearchSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Blood Banks
 *   description: Blood bank management, inventory, slots, and availability search
 */

/**
 * @swagger
 * /blood-banks/search:
 *   get:
 *     summary: Search blood availability by group and location
 *     tags: [Blood Banks]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         required: true
 *         schema:
 *           type: string
 *           enum: [A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG]
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: Nearby blood banks with available inventory
 */
router.get('/search', validate(bloodSearchSchema, 'query'), asyncHandler(bloodBankController.searchBlood));

/**
 * @swagger
 * /blood-banks/register:
 *   post:
 *     summary: Register a blood bank
 *     tags: [Blood Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, city, state, latitude, longitude, contactPhone]
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
 *     responses:
 *       201:
 *         description: Blood bank registered
 */
router.post('/register', authenticate, authorize('BLOOD_BANK'), validate(bloodBankSchema), asyncHandler(bloodBankController.registerBloodBank));

/**
 * @swagger
 * /blood-banks/me/profile:
 *   get:
 *     summary: Get own blood bank profile
 *     tags: [Blood Banks]
 *     responses:
 *       200:
 *         description: Blood bank profile
 */
router.get('/me/profile', authenticate, authorize('BLOOD_BANK'), asyncHandler(bloodBankController.getProfile));

/**
 * @swagger
 * /blood-banks/me/profile:
 *   patch:
 *     summary: Update own blood bank profile
 *     tags: [Blood Banks]
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/me/profile', authenticate, authorize('BLOOD_BANK'), asyncHandler(bloodBankController.updateProfile));

/**
 * @swagger
 * /blood-banks/me/dashboard:
 *   get:
 *     summary: Get blood bank dashboard (inventory, appointments, expirations)
 *     tags: [Blood Banks]
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/me/dashboard', authenticate, authorize('BLOOD_BANK'), asyncHandler(bloodBankController.getDashboard));

/**
 * @swagger
 * /blood-banks/me/inventory:
 *   post:
 *     summary: Add blood inventory item
 *     tags: [Blood Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bloodGroup, availableUnits]
 *             properties:
 *               bloodGroup:
 *                 type: string
 *               componentType:
 *                 type: string
 *                 enum: [WHOLE_BLOOD, PLATELETS, PLASMA]
 *               availableUnits:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Inventory item added
 */
router.post('/me/inventory', authenticate, authorize('BLOOD_BANK'), validate(inventorySchema), asyncHandler(bloodBankController.addInventory));

/**
 * @swagger
 * /blood-banks/me/inventory/{id}:
 *   patch:
 *     summary: Update inventory item (reserve, release, mark expired, or edit)
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory updated
 */
router.patch('/me/inventory/:id', authenticate, authorize('BLOOD_BANK'), validate(inventoryUpdateSchema), asyncHandler(bloodBankController.updateInventoryItem));

/**
 * @swagger
 * /blood-banks/me/donations:
 *   post:
 *     summary: Record a donation
 *     tags: [Blood Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [donorProfileId, bloodGroup]
 *             properties:
 *               donorProfileId:
 *                 type: string
 *               bloodGroup:
 *                 type: string
 *               donationType:
 *                 type: string
 *                 enum: [WHOLE_BLOOD, PLATELETS, PLASMA]
 *     responses:
 *       201:
 *         description: Donation recorded
 */
router.post('/me/donations', authenticate, authorize('BLOOD_BANK'), validate(donationRecordSchema), asyncHandler(bloodBankController.recordDonation));

/**
 * @swagger
 * /blood-banks/me/slots:
 *   post:
 *     summary: Create appointment slot
 *     tags: [Blood Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, startTime, endTime]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               capacity:
 *                 type: integer
 *                 default: 5
 *     responses:
 *       201:
 *         description: Slot created
 */
router.post('/me/slots', authenticate, authorize('BLOOD_BANK'), validate(slotSchema), asyncHandler(bloodBankController.createAppointmentSlot));

/**
 * @swagger
 * /blood-banks:
 *   get:
 *     summary: List all verified blood banks
 *     tags: [Blood Banks]
 *     security: []
 *     responses:
 *       200:
 *         description: List of blood banks
 */
router.get('/', optionalAuth, asyncHandler(bloodBankController.listBloodBanks));

/**
 * @swagger
 * /blood-banks/{id}/slots:
 *   get:
 *     summary: Get available appointment slots for a blood bank
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available slots
 */
router.get('/:id/slots', optionalAuth, asyncHandler(bloodBankController.getSlots));

/**
 * @swagger
 * /blood-banks/{id}/inventory:
 *   get:
 *     summary: Get blood bank inventory
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blood bank inventory
 */
router.get('/:id/inventory', optionalAuth, asyncHandler(bloodBankController.getInventory));

/**
 * @swagger
 * /blood-banks/{id}:
 *   get:
 *     summary: Get blood bank details
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blood bank details
 */
router.get('/:id', optionalAuth, asyncHandler(bloodBankController.getBloodBank));

module.exports = router;
