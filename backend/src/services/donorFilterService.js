const prisma = require('../config/database');
const { getCompatibleDonorGroups } = require('../utils/bloodCompatibility');
const { haversineDistance } = require('../utils/distance');
const { rankDonors } = require('./scoringService');

async function findEligibleDonors(bloodGroup, hospitalLat, hospitalLon, maxRadiusKm, excludeDonorIds = []) {
  const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

  const donors = await prisma.donorProfile.findMany({
    where: {
      bloodGroup: { in: compatibleGroups },
      availability: 'AVAILABLE',
      eligibilityStatus: 'ELIGIBLE',
      latitude: { not: null },
      longitude: { not: null },
      user: { accountStatus: 'ACTIVE' },
      id: excludeDonorIds.length ? { notIn: excludeDonorIds } : undefined,
    },
    include: {
      user: { select: { id: true, fullName: true, phone: true } },
    },
  });

  const withDistance = donors
    .map((donor) => {
      const distanceKm = haversineDistance(
        hospitalLat,
        hospitalLon,
        donor.latitude,
        donor.longitude
      );
      return { ...donor, distanceKm };
    })
    .filter((d) => d.distanceKm !== null && d.distanceKm <= maxRadiusKm);

  const withoutActiveEmergency = withDistance.filter((d) => !d.activeEmergencyId);

  return rankDonors(withoutActiveEmergency, maxRadiusKm);
}

async function getAlreadyNotifiedDonorIds(emergencyRequestId) {
  const responses = await prisma.emergencyDonorResponse.findMany({
    where: { emergencyRequestId },
    select: { donorProfileId: true },
  });
  return responses.map((r) => r.donorProfileId);
}

module.exports = { findEligibleDonors, getAlreadyNotifiedDonorIds };
