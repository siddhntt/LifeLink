const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');
const {
  startEmergencySearch,
  handleDonorResponse,
  checkDuplicateRequest,
} = require('../services/emergencyService');
const config = require('../config');

async function registerHospital(req, res) {
  const userId = req.user.id;
  const existing = await prisma.hospital.findUnique({ where: { userId } });
  if (existing) throw new AppError('Hospital profile already exists', 409, 'DUPLICATE');

  const hospital = await prisma.hospital.create({
    data: { userId, ...req.body },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { profileComplete: true, fullName: req.body.name },
  });

  sendSuccess(res, hospital, 'Hospital registered', 201);
}

async function getProfile(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');
  sendSuccess(res, hospital);
}

async function updateProfile(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');

  const updated = await prisma.hospital.update({
    where: { id: hospital.id },
    data: req.body,
  });
  sendSuccess(res, updated, 'Profile updated');
}

async function createEmergencyRequest(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');
  if (hospital.verificationStatus !== 'VERIFIED') {
    throw new AppError('Only verified hospitals can create emergency requests', 403, 'NOT_VERIFIED');
  }

  const duplicate = await checkDuplicateRequest(hospital.id, req.body);
  const expiresAt = new Date(Date.now() + config.emergency.requestExpiryHours * 60 * 60 * 1000);

  const emergency = await prisma.emergencyRequest.create({
    data: {
      hospitalId: hospital.id,
      ...req.body,
      requiredBy: new Date(req.body.requiredBy),
      expiresAt,
      flaggedForReview: !!duplicate,
      flagReason: duplicate ? 'Similar request created within the last hour' : null,
      maxRadiusKm: config.emergency.maxRadiusKm,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'EMERGENCY_CREATED',
      entityType: 'EmergencyRequest',
      entityId: emergency.id,
    },
  });

  startEmergencySearch(emergency.id).catch(console.error);

  sendSuccess(res, emergency, 'Emergency request created', 201);
}

async function getEmergencyRequests(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');

  const requests = await prisma.emergencyRequest.findMany({
    where: { hospitalId: hospital.id },
    include: {
      donorResponses: {
        include: {
          donorProfile: {
            include: { user: { select: { fullName: true } } },
          },
        },
      },
      radiusExpansions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, requests);
}

async function getEmergencyRequest(req, res) {
  const { role, hospital, donorProfile } = req.user;
  const where = { id: req.params.id };

  if (role === 'HOSPITAL') {
    if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');
    where.hospitalId = hospital.id;
  }

  const donorInclude = role === 'DONOR'
    ? {
        where: { donorProfileId: donorProfile?.id },
        include: { donorProfile: { select: { id: true } } },
      }
    : {
        include: {
          donorProfile: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
        },
        orderBy: { priorityScore: 'desc' },
      };

  const request = await prisma.emergencyRequest.findFirst({
    where,
    include: {
      donorResponses: donorInclude,
      radiusExpansions: role !== 'DONOR' ? { orderBy: { expandedAt: 'asc' } } : false,
      hospital: { select: { name: true, city: true, latitude: true, longitude: true, address: true } },
    },
  });

  if (!request) throw new AppError('Emergency request not found', 404, 'NOT_FOUND');

  if (role === 'DONOR') {
    const { patientRef, ...safe } = request;
    sendSuccess(res, safe);
    return;
  }

  sendSuccess(res, request);
}

async function cancelEmergencyRequest(req, res) {
  const hospital = req.user.hospital;
  const request = await prisma.emergencyRequest.findFirst({
    where: { id: req.params.id, hospitalId: hospital.id },
  });

  if (!request) throw new AppError('Emergency request not found', 404, 'NOT_FOUND');
  if (['FULFILLED', 'CANCELLED'].includes(request.status)) {
    throw new AppError('Request cannot be cancelled', 400, 'INVALID_STATUS');
  }

  const updated = await prisma.emergencyRequest.update({
    where: { id: request.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'EMERGENCY_CANCELLED',
      entityType: 'EmergencyRequest',
      entityId: request.id,
    },
  });

  const { emitEmergencyEvent } = require('../services/emergencyService');
  emitEmergencyEvent(request.id, 'emergency:cancelled', {
    requestId: request.id,
    status: 'CANCELLED',
  });

  sendSuccess(res, updated, 'Emergency request cancelled');
}

async function getDashboard(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');

  const [activeEmergencies, requestHistory, bloodBanks] = await Promise.all([
    prisma.emergencyRequest.findMany({
      where: { hospitalId: hospital.id, status: { in: ['CREATED', 'SEARCHING', 'PARTIALLY_FULFILLED'] } },
      include: {
        donorResponses: {
          where: { status: { in: ['ACCEPTED', 'NOTIFIED', 'VIEWED'] } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emergencyRequest.findMany({
      where: { hospitalId: hospital.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.bloodBank.findMany({
      where: { verificationStatus: 'VERIFIED' },
      select: { id: true, name: true, city: true, latitude: true, longitude: true },
      take: 10,
    }),
  ]);

  sendSuccess(res, { hospital, activeEmergencies, requestHistory, nearbyBloodBanks: bloodBanks });
}

async function respondToEmergency(req, res) {
  const profile = req.user.donorProfile;
  if (!profile) throw new AppError('Donor profile required', 403, 'FORBIDDEN');

  const response = await handleDonorResponse(
    req.params.id,
    profile.id,
    req.body.response
  );

  sendSuccess(res, response, `Response recorded: ${req.body.response}`);
}

async function updateDonorResponseStatus(req, res) {
  const hospital = req.user.hospital;
  if (!hospital) throw new AppError('Hospital profile not found', 404, 'NOT_FOUND');

  const emergency = await prisma.emergencyRequest.findFirst({
    where: { id: req.params.id, hospitalId: hospital.id },
  });
  if (!emergency) throw new AppError('Emergency request not found', 404, 'NOT_FOUND');

  const response = await prisma.emergencyDonorResponse.findFirst({
    where: { id: req.params.responseId, emergencyRequestId: emergency.id },
  });
  if (!response) throw new AppError('Donor response not found', 404, 'NOT_FOUND');
  if (response.status !== 'ACCEPTED' && req.body.status === 'ARRIVED') {
    throw new AppError('Donor must have accepted before marking arrived', 400, 'INVALID_STATUS');
  }

  const now = new Date();
  const data = { status: req.body.status };
  if (req.body.status === 'ARRIVED') data.arrivedAt = now;
  if (req.body.status === 'DONATION_COMPLETED') data.completedAt = now;

  const updated = await prisma.emergencyDonorResponse.update({
    where: { id: response.id },
    data,
    include: {
      donorProfile: { include: { user: { select: { fullName: true, phone: true } } } },
    },
  });

  const { emitEmergencyEvent } = require('../services/emergencyService');
  emitEmergencyEvent(emergency.id, 'emergency:donor-response', {
    requestId: emergency.id,
    donorProfileId: response.donorProfileId,
    response: req.body.status,
    donorName: updated.donorProfile.user.fullName,
  });

  sendSuccess(res, updated, `Donor status updated to ${req.body.status}`);
}

module.exports = {
  registerHospital,
  getProfile,
  updateProfile,
  createEmergencyRequest,
  getEmergencyRequests,
  getEmergencyRequest,
  cancelEmergencyRequest,
  getDashboard,
  respondToEmergency,
  updateDonorResponseStatus,
};
