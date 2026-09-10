const express = require('express');
const locationController = require('../controllers/locationController');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { nearbySchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Location
 *   description: Nearby blood banks, hospitals, and camps
 */

/**
 * @swagger
 * /locations/nearby:
 *   get:
 *     summary: Get nearby blood banks, hospitals, and donation camps
 *     tags: [Location]
 *     security: []
 *     parameters:
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
 *           default: 25
 *     responses:
 *       200:
 *         description: Nearby locations with distances
 */
router.get('/nearby', validate(nearbySchema, 'query'), optionalAuth, asyncHandler(locationController.getNearbyLocations));

module.exports = router;
