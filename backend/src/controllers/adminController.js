const prisma = require('../config/database');
const { sendSuccess } = require('../utils/helpers');
const { AppError } = require('../utils/helpers');

async function getDashboard(req, res) {
  const [
    userCounts,
    activeEmergencies,
    pendingHospitals,
    pendingBloodBanks,
    pendingNGOs,
    recentEmergencies,
    donorStats,
    campStats,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.emergencyRequest.count({
      where: { status: { in: ['SEARCHING', 'PARTIALLY_FULFILLED'] } },
    }),
    prisma.hospital.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.bloodBank.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.nGO.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.emergencyRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { hospital: { select: { name: true } } },
    }),
    prisma.donorProfile.aggregate({
      _count: true,
      _avg: { responseCount: true, acceptCount: true },
    }),
    prisma.donationCamp.groupBy({ by: ['status'], _count: true }),
  ]);

  const pendingVerifications = pendingHospitals + pendingBloodBanks + pendingNGOs;

  const fulfilled = await prisma.emergencyRequest.count({ where: { status: 'FULFILLED' } });
  const total = await prisma.emergencyRequest.count();
  const fulfillmentRate = total > 0 ? Math.round((fulfilled / total) * 100) : 0;

  const avgResponseTime = await prisma.emergencyDonorResponse.aggregate({
    _avg: { responseTimeMs: true },
    where: { responseTimeMs: { not: null } },
  });

  const inventoryStats = await prisma.bloodInventory.groupBy({
    by: ['bloodGroup'],
    _sum: { availableUnits: true },
    where: { status: 'AVAILABLE' },
  });

  const lowStockGroups = inventoryStats
    .filter((g) => (g._sum.availableUnits || 0) < 5)
    .map((g) => g.bloodGroup);

  sendSuccess(res, {
    userCounts,
    activeEmergencies,
    pendingVerifications,
    recentEmergencies,
    donorStats,
    campStats,
    fulfillmentRate,
    avgResponseTimeMs: avgResponseTime._avg.responseTimeMs,
    inventoryStats,
    lowStockGroups,
    demoNote: 'Analytics include demo seed data in development',
  });
}

async function getUsers(req, res) {
  const { role, status, search, page = 1, limit = 20 } = req.query;
  const where = {};
  if (role) where.role = role;
  if (status) where.accountStatus = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        accountStatus: true,
        verificationStatus: true,
        profileComplete: true,
        createdAt: true,
        lastLoginAt: true,
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, { users, total, page: parseInt(page), limit: parseInt(limit) });
}

async function updateUser(req, res) {
  const { accountStatus, verificationStatus } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(accountStatus && { accountStatus }),
      ...(verificationStatus && { verificationStatus }),
    },
  });

  if (accountStatus === 'INACTIVE' || accountStatus === 'SUSPENDED') {
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user.id,
        details: { accountStatus },
      },
    });
  }

  sendSuccess(res, user, 'User updated');
}

async function verifyHospital(req, res) {
  const { status, notes } = req.body;
  const hospital = await prisma.hospital.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: status,
      verificationNotes: notes,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      verifiedById: req.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'HOSPITAL_VERIFIED',
      entityType: 'Hospital',
      entityId: hospital.id,
      details: { status, notes },
    },
  });

  sendSuccess(res, hospital, 'Hospital verification updated');
}

async function verifyBloodBank(req, res) {
  const { status, notes } = req.body;
  const bloodBank = await prisma.bloodBank.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: status,
      verificationNotes: notes,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      verifiedById: req.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'BLOOD_BANK_VERIFIED',
      entityType: 'BloodBank',
      entityId: bloodBank.id,
      details: { status, notes },
    },
  });

  sendSuccess(res, bloodBank, 'Blood bank verification updated');
}

async function verifyNGO(req, res) {
  const { status, notes } = req.body;
  const ngo = await prisma.nGO.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: status,
      verificationNotes: notes,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      verifiedById: req.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'NGO_VERIFIED',
      entityType: 'NGO',
      entityId: ngo.id,
      details: { status, notes },
    },
  });

  sendSuccess(res, ngo, 'NGO verification updated');
}

async function getPendingVerifications(req, res) {
  const [hospitals, bloodBanks, ngos, camps] = await Promise.all([
    prisma.hospital.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { user: { select: { phone: true, createdAt: true } } },
    }),
    prisma.bloodBank.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { user: { select: { phone: true, createdAt: true } } },
    }),
    prisma.nGO.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { user: { select: { phone: true, createdAt: true } } },
    }),
    prisma.donationCamp.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        bloodBank: { select: { name: true } },
        ngo: { select: { name: true } },
      },
    }),
  ]);

  sendSuccess(res, { hospitals, bloodBanks, ngos, camps });
}

async function approveCamp(req, res) {
  const camp = await prisma.donationCamp.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED' },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'CAMP_CREATED',
      entityType: 'DonationCamp',
      entityId: camp.id,
      details: { action: 'approved' },
    },
  });

  sendSuccess(res, camp, 'Camp approved');
}

async function getFlaggedEmergencies(req, res) {
  const requests = await prisma.emergencyRequest.findMany({
    where: { flaggedForReview: true },
    include: {
      hospital: { select: { name: true, city: true } },
      donorResponses: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, requests);
}

async function clearEmergencyFlag(req, res) {
  const request = await prisma.emergencyRequest.findUnique({
    where: { id: req.params.id },
  });
  if (!request) throw new AppError('Emergency request not found', 404, 'NOT_FOUND');

  const updated = await prisma.emergencyRequest.update({
    where: { id: req.params.id },
    data: {
      flaggedForReview: false,
      flagReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user.id,
      action: 'EMERGENCY_CREATED',
      entityType: 'EmergencyRequest',
      entityId: request.id,
      details: { action: 'flag_cleared', previousReason: request.flagReason },
    },
  });

  sendSuccess(res, updated, 'Emergency flag cleared');
}

module.exports = {
  getDashboard,
  getUsers,
  updateUser,
  verifyHospital,
  verifyBloodBank,
  verifyNGO,
  getPendingVerifications,
  approveCamp,
  getFlaggedEmergencies,
  clearEmergencyFlag,
};
