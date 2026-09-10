const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authVerifySchema, logoutSchema, emailRegisterSchema, emailLoginSchema } = require('../validators/schemas');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Email/password auth and Firebase phone OTP verification
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, confirmPassword, role]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [DONOR, HOSPITAL, BLOOD_BANK, CAMP_ORGANIZER]
 *     responses:
 *       201:
 *         description: Registered successfully
 */
router.post('/register', validate(emailRegisterSchema), asyncHandler(authController.emailRegister));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validate(emailLoginSchema), asyncHandler(authController.emailLogin));

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify Firebase ID token and create/login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [DONOR, HOSPITAL, BLOOD_BANK, CAMP_ORGANIZER, ADMIN]
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 */
router.post('/verify', validate(authVerifySchema), asyncHandler(authController.verifyAuth));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get('/me', authenticate, asyncHandler(authController.getMe));

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/me', authenticate, asyncHandler(authController.updateMe));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and optionally remove device token
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', authenticate, validate(logoutSchema), asyncHandler(authController.logout));

module.exports = router;
