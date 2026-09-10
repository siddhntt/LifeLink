const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { setSocketIO } = require('../services/emergencyService');

// Throttle: minimum ms between location updates per donor per request
const LOCATION_THROTTLE_MS = 5000;
const locationThrottle = new Map(); // key: `${donorId}:${requestId}`

function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  setSocketIO(io);

  // Auth middleware — works for both Firebase JWT and email/password JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.accountStatus !== 'ACTIVE') {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.id} (${socket.user.role})`);

    // ─── Hospital / Admin joins emergency room to receive updates ───────────
    socket.on('join-emergency', (requestId) => {
      if (['HOSPITAL', 'ADMIN'].includes(socket.user.role)) {
        socket.join(`emergency-request:${requestId}`);
      }
    });

    socket.on('leave-emergency', (requestId) => {
      socket.leave(`emergency-request:${requestId}`);
    });

    // ─── Donor joins their own tracking room so they can send location ───────
    socket.on('donor:join-tracking', async (requestId) => {
      if (socket.user.role !== 'DONOR') {
        return socket.emit('error', { message: 'Only donors can join tracking' });
      }

      // Verify donor has ACCEPTED this request
      const profile = await prisma.donorProfile.findUnique({
        where: { userId: socket.user.id },
      });
      if (!profile) {
        return socket.emit('error', { message: 'Donor profile not found' });
      }

      const response = await prisma.emergencyDonorResponse.findFirst({
        where: {
          emergencyRequestId: requestId,
          donorProfileId: profile.id,
          status: { in: ['ACCEPTED', 'ARRIVED'] },
        },
      });
      if (!response) {
        return socket.emit('error', { message: 'You have not accepted this emergency request' });
      }

      // Verify request is still active
      const request = await prisma.emergencyRequest.findUnique({
        where: { id: requestId },
      });
      if (!request || ['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status)) {
        return socket.emit('error', { message: 'Emergency request is no longer active' });
      }

      socket.join(`emergency-request:${requestId}`);
      socket.donorProfileId = profile.id;
      socket.emit('donor:tracking-joined', { requestId });
    });

    // ─── Donor sends live location update ────────────────────────────────────
    socket.on('donor:location-update', async ({ requestId, latitude, longitude, accuracy }) => {
      if (socket.user.role !== 'DONOR') return;
      if (!socket.donorProfileId) return;

      // Input validation
      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      ) {
        return socket.emit('error', { message: 'Invalid coordinates' });
      }

      // Throttle: ignore updates more frequent than LOCATION_THROTTLE_MS
      const throttleKey = `${socket.donorProfileId}:${requestId}`;
      const now = Date.now();
      const lastSent = locationThrottle.get(throttleKey) || 0;
      if (now - lastSent < LOCATION_THROTTLE_MS) return;
      locationThrottle.set(throttleKey, now);

      try {
        // Verify donor still has an active acceptance
        const response = await prisma.emergencyDonorResponse.findFirst({
          where: {
            emergencyRequestId: requestId,
            donorProfileId: socket.donorProfileId,
            status: { in: ['ACCEPTED', 'ARRIVED'] },
          },
        });
        if (!response) return;

        // Verify request still active
        const request = await prisma.emergencyRequest.findUnique({
          where: { id: requestId },
          select: { status: true },
        });
        if (!request || ['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status)) {
          socket.emit('donor:tracking-stopped', { requestId, reason: 'Emergency request ended' });
          return;
        }

        // Upsert latest location only
        await prisma.donorLiveLocation.upsert({
          where: {
            emergencyRequestId_donorProfileId: {
              emergencyRequestId: requestId,
              donorProfileId: socket.donorProfileId,
            },
          },
          update: { latitude, longitude, accuracy: accuracy || null },
          create: {
            emergencyRequestId: requestId,
            donorProfileId: socket.donorProfileId,
            latitude,
            longitude,
            accuracy: accuracy || null,
          },
        });

        // Broadcast to hospital (everyone in the emergency room except the donor)
        socket.to(`emergency-request:${requestId}`).emit('donor:location-update', {
          requestId,
          donorProfileId: socket.donorProfileId,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Socket] Location update error:', err.message);
      }
    });

    // ─── Donor stops sharing location ────────────────────────────────────────
    socket.on('donor:location-stop', async ({ requestId }) => {
      if (socket.user.role !== 'DONOR' || !socket.donorProfileId) return;

      try {
        await prisma.donorLiveLocation.deleteMany({
          where: {
            emergencyRequestId: requestId,
            donorProfileId: socket.donorProfileId,
          },
        });
      } catch {
        // ignore if already deleted
      }

      // Clean up throttle
      locationThrottle.delete(`${socket.donorProfileId}:${requestId}`);

      socket.to(`emergency-request:${requestId}`).emit('donor:location-stopped', {
        requestId,
        donorProfileId: socket.donorProfileId,
      });

      socket.emit('donor:tracking-stopped', { requestId, reason: 'You stopped sharing location' });
    });

    // ─── Cleanup on disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.id}`);
      // Clean throttle entries for this donor
      if (socket.donorProfileId) {
        for (const key of locationThrottle.keys()) {
          if (key.startsWith(`${socket.donorProfileId}:`)) {
            locationThrottle.delete(key);
          }
        }
      }
    });
  });

  return io;
}

module.exports = { initSocketIO };
