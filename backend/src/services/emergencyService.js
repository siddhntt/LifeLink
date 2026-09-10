const prisma = require('../config/database');
const config = require('../config');
const { sendPushNotification } = require('../config/firebase');
const { BLOOD_GROUP_LABELS } = require('../utils/constants');
const { formatDistance } = require('../utils/distance');
const { findEligibleDonors, getAlreadyNotifiedDonorIds } = require('./donorFilterService');

let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}

function emitEmergencyEvent(requestId, event, data) {
  if (io) {
    io.to(`emergency-request:${requestId}`).emit(event, data);
  }
}

async function getRadiusStages() {
  const stages = await prisma.emergencyRadiusConfig.findMany({
    where: { isActive: true },
    orderBy: { stage: 'asc' },
  });

  if (stages.length === 0) {
    return [
      { stage: 0, radiusKm: 5, responseWaitMs: config.emergency.responseWaitMs },
      { stage: 1, radiusKm: 10, responseWaitMs: config.emergency.responseWaitMs },
      { stage: 2, radiusKm: 20, responseWaitMs: config.emergency.responseWaitMs },
      { stage: 3, radiusKm: 50, responseWaitMs: config.emergency.responseWaitMs },
    ];
  }
  return stages;
}

async function notifyDonors(emergency, donors, radiusKm, radiusStage) {
  const notified = [];

  for (const donor of donors) {
    const response = await prisma.emergencyDonorResponse.create({
      data: {
        emergencyRequestId: emergency.id,
        donorProfileId: donor.id,
        status: 'NOTIFIED',
        priorityScore: donor.priorityScore,
        distanceKm: donor.distanceKm,
        notifiedAtRadiusKm: radiusKm,
        radiusStage,
      },
    });

    const tokens = await prisma.deviceToken.findMany({
      where: { userId: donor.userId, isActive: true },
      select: { token: true },
    });

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: donor.userId },
    });

    if (prefs?.emergencyAlerts !== false && tokens.length) {
      const bloodLabel = BLOOD_GROUP_LABELS[emergency.bloodGroup];
      await sendPushNotification(
        tokens.map((t) => t.token),
        {
          title: 'Emergency Blood Required',
          body: `Emergency: ${bloodLabel} blood required. Approx. ${formatDistance(donor.distanceKm)} away. Tap to respond.`,
        },
        {
          type: 'EMERGENCY_REQUEST',
          emergencyRequestId: emergency.id,
          bloodGroup: emergency.bloodGroup,
        }
      );
    }

    await prisma.notification.create({
      data: {
        userId: donor.userId,
        type: 'EMERGENCY_REQUEST',
        title: 'Emergency Blood Required',
        body: `${BLOOD_GROUP_LABELS[emergency.bloodGroup]} blood needed urgently. Approx. ${formatDistance(donor.distanceKm)} away.`,
        data: { emergencyRequestId: emergency.id },
      },
    });

    notified.push(response);
  }

  await prisma.emergencyRequest.update({
    where: { id: emergency.id },
    data: {
      notifiedCount: { increment: notified.length },
      status: 'SEARCHING',
      searchStartedAt: emergency.searchStartedAt || new Date(),
    },
  });

  emitEmergencyEvent(emergency.id, 'emergency:notification-sent', {
    requestId: emergency.id,
    count: notified.length,
    radiusKm,
    radiusStage,
  });

  return notified;
}

async function searchAndNotify(emergency, fromRadiusKm, toRadiusKm, radiusStage) {
  const hospital = await prisma.hospital.findUnique({ where: { id: emergency.hospitalId } });
  if (!hospital) return [];

  const alreadyNotified = await getAlreadyNotifiedDonorIds(emergency.id);
  const allEligible = await findEligibleDonors(
    emergency.bloodGroup,
    hospital.latitude,
    hospital.longitude,
    toRadiusKm,
    alreadyNotified
  );

  const newDonors = allEligible.filter(
    (d) => d.distanceKm > fromRadiusKm && d.distanceKm <= toRadiusKm
  );

  if (fromRadiusKm === 0) {
    const firstStageDonors = allEligible.filter((d) => d.distanceKm <= toRadiusKm);
    return notifyDonors(emergency, firstStageDonors, toRadiusKm, radiusStage);
  }

  return notifyDonors(emergency, newDonors, toRadiusKm, radiusStage);
}

async function startEmergencySearch(emergencyRequestId) {
  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyRequestId },
    include: { hospital: true },
  });

  if (!emergency || emergency.status === 'CANCELLED' || emergency.status === 'FULFILLED') {
    return null;
  }

  const stages = await getRadiusStages();
  const firstStage = stages[0];

  await prisma.emergencyRequest.update({
    where: { id: emergencyRequestId },
    data: {
      status: 'SEARCHING',
      currentRadiusKm: firstStage.radiusKm,
      radiusStage: 0,
      searchStartedAt: new Date(),
    },
  });

  emitEmergencyEvent(emergencyRequestId, 'emergency:created', {
    requestId: emergencyRequestId,
    status: 'SEARCHING',
  });

  const notified = await searchAndNotify(emergency, 0, firstStage.radiusKm, 0);

  scheduleRadiusExpansion(emergencyRequestId, 0);

  return { emergency, notified: notified.length };
}

const expansionTimers = new Map();

function scheduleRadiusExpansion(emergencyRequestId, currentStage) {
  if (expansionTimers.has(emergencyRequestId)) {
    clearTimeout(expansionTimers.get(emergencyRequestId));
  }

  getRadiusStages().then((stages) => {
    const stage = stages[currentStage];
    if (!stage) return;

    const timer = setTimeout(async () => {
      await expandRadius(emergencyRequestId, currentStage);
    }, stage.responseWaitMs);

    expansionTimers.set(emergencyRequestId, timer);
  });
}

async function expandRadius(emergencyRequestId, currentStage) {
  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyRequestId },
  });

  if (!emergency || ['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(emergency.status)) {
    expansionTimers.delete(emergencyRequestId);
    return;
  }

  if (emergency.acceptedUnits >= emergency.requiredUnits) {
    expansionTimers.delete(emergencyRequestId);
    return;
  }

  const stages = await getRadiusStages();
  const nextStage = stages[currentStage + 1];

  if (!nextStage) {
    expansionTimers.delete(emergencyRequestId);
    return;
  }

  const prevRadius = stages[currentStage].radiusKm;

  await prisma.emergencyRadiusLog.create({
    data: {
      emergencyRequestId,
      fromRadiusKm: prevRadius,
      toRadiusKm: nextStage.radiusKm,
    },
  });

  await prisma.emergencyRequest.update({
    where: { id: emergencyRequestId },
    data: {
      currentRadiusKm: nextStage.radiusKm,
      radiusStage: currentStage + 1,
    },
  });

  emitEmergencyEvent(emergencyRequestId, 'emergency:radius-expanded', {
    requestId: emergencyRequestId,
    fromRadiusKm: prevRadius,
    toRadiusKm: nextStage.radiusKm,
    stage: currentStage + 1,
  });

  const notified = await searchAndNotify(
    emergency,
    prevRadius,
    nextStage.radiusKm,
    currentStage + 1
  );

  if (emergency.acceptedUnits < emergency.requiredUnits) {
    scheduleRadiusExpansion(emergencyRequestId, currentStage + 1);
  }
}

async function handleDonorResponse(emergencyRequestId, donorProfileId, response) {
  const existing = await prisma.emergencyDonorResponse.findUnique({
    where: {
      emergencyRequestId_donorProfileId: { emergencyRequestId, donorProfileId },
    },
  });

  if (!existing) {
    throw new Error('Donor was not notified for this emergency');
  }

  if (['ACCEPTED', 'REJECTED'].includes(existing.status)) {
    throw new Error('Already responded to this emergency');
  }

  const now = new Date();
  const responseTimeMs = now.getTime() - existing.notifiedAt.getTime();

  const updated = await prisma.emergencyDonorResponse.update({
    where: { id: existing.id },
    data: {
      status: response,
      respondedAt: now,
      responseTimeMs,
      viewedAt: existing.viewedAt || now,
    },
    include: {
      donorProfile: { include: { user: { select: { fullName: true } } } },
    },
  });

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: emergencyRequestId },
  });

  await prisma.emergencyRequest.update({
    where: { id: emergencyRequestId },
    data: { respondedCount: { increment: 1 } },
  });

  const donor = await prisma.donorProfile.findUnique({ where: { id: donorProfileId } });
  const newAcceptCount = response === 'ACCEPTED' ? donor.acceptCount + 1 : donor.acceptCount;
  const newRejectCount = response === 'REJECTED' ? donor.rejectCount + 1 : donor.rejectCount;
  const newResponseCount = donor.responseCount + 1;
  const newAvgResponseTime = donor.avgResponseTimeMs
    ? Math.round((donor.avgResponseTimeMs * donor.responseCount + responseTimeMs) / newResponseCount)
    : responseTimeMs;

  await prisma.donorProfile.update({
    where: { id: donorProfileId },
    data: {
      responseCount: newResponseCount,
      acceptCount: newAcceptCount,
      rejectCount: newRejectCount,
      avgResponseTimeMs: newAvgResponseTime,
      activeEmergencyId: response === 'ACCEPTED' ? emergencyRequestId : donor.activeEmergencyId,
    },
  });

  if (response === 'ACCEPTED') {
    const newAccepted = emergency.acceptedUnits + 1;
    const newStatus =
      newAccepted >= emergency.requiredUnits
        ? 'FULFILLED'
        : newAccepted > 0
          ? 'PARTIALLY_FULFILLED'
          : emergency.status;

    await prisma.emergencyRequest.update({
      where: { id: emergencyRequestId },
      data: {
        acceptedUnits: newAccepted,
        status: newStatus,
        fulfilledAt: newStatus === 'FULFILLED' ? now : undefined,
      },
    });

    if (newStatus === 'FULFILLED') {
      if (expansionTimers.has(emergencyRequestId)) {
        clearTimeout(expansionTimers.get(emergencyRequestId));
        expansionTimers.delete(emergencyRequestId);
      }

      await prisma.auditLog.create({
        data: {
          action: 'EMERGENCY_FULFILLED',
          entityType: 'EmergencyRequest',
          entityId: emergencyRequestId,
          details: { acceptedUnits: newAccepted, requiredUnits: emergency.requiredUnits },
        },
      });

      emitEmergencyEvent(emergencyRequestId, 'emergency:fulfilled', {
        requestId: emergencyRequestId,
        acceptedUnits: newAccepted,
      });
    }
  }

  emitEmergencyEvent(emergencyRequestId, 'emergency:donor-response', {
    requestId: emergencyRequestId,
    donorProfileId,
    response,
    donorName: updated.donorProfile.user.fullName,
    responseTimeMs,
  });

  return updated;
}

async function checkDuplicateRequest(hospitalId, data) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const similar = await prisma.emergencyRequest.findFirst({
    where: {
      hospitalId,
      bloodGroup: data.bloodGroup,
      requiredUnits: data.requiredUnits,
      patientRef: data.patientRef || undefined,
      createdAt: { gte: oneHourAgo },
      status: { notIn: ['CANCELLED', 'EXPIRED'] },
    },
  });
  return similar;
}

module.exports = {
  setSocketIO,
  startEmergencySearch,
  handleDonorResponse,
  checkDuplicateRequest,
  emitEmergencyEvent,
  getRadiusStages,
};
