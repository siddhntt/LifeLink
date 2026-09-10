const prisma = require('../config/database');
const config = require('../config');

async function getScoringWeights() {
  const dbWeights = await prisma.donorScoringConfig.findMany({ where: { isActive: true } });

  if (dbWeights.length === 0) {
    return {
      distance: config.scoring.distance,
      eligibility: config.scoring.eligibility,
      availability: config.scoring.availability,
      responseHistory: config.scoring.responseHistory,
    };
  }

  const weights = {};
  for (const w of dbWeights) {
    weights[w.key] = w.weight;
  }
  return weights;
}

function scoreDistance(distanceKm, maxRadiusKm = 50) {
  if (distanceKm == null) return 0;
  const normalized = Math.max(0, 1 - distanceKm / maxRadiusKm);
  return normalized * 100;
}

function scoreEligibility(status) {
  const map = { ELIGIBLE: 100, TEMPORARILY_UNAVAILABLE: 0, NEEDS_MEDICAL_REVIEW: 30 };
  return map[status] ?? 0;
}

function scoreAvailability(status) {
  return status === 'AVAILABLE' ? 100 : 0;
}

function scoreResponseHistory(profile) {
  if (!profile.responseCount) return 50;
  const acceptRate = profile.acceptCount / profile.responseCount;
  const responseBonus = profile.avgResponseTimeMs
    ? Math.max(0, 1 - profile.avgResponseTimeMs / 600000) * 30
    : 15;
  return Math.min(100, acceptRate * 70 + responseBonus);
}

async function rankDonors(donors, maxRadiusKm) {
  const weights = await getScoringWeights();

  const ranked = donors.map((donor) => {
    const distanceScore = scoreDistance(donor.distanceKm, maxRadiusKm);
    const eligibilityScore = scoreEligibility(donor.eligibilityStatus);
    const availabilityScore = scoreAvailability(donor.availability);
    const historyScore = scoreResponseHistory(donor);

    const priorityScore =
      distanceScore * weights.distance +
      eligibilityScore * weights.eligibility +
      availabilityScore * weights.availability +
      historyScore * weights.responseHistory;

    return {
      ...donor,
      priorityScore: Math.round(priorityScore * 100) / 100,
      scoreBreakdown: {
        distance: Math.round(distanceScore * weights.distance * 100) / 100,
        eligibility: Math.round(eligibilityScore * weights.eligibility * 100) / 100,
        availability: Math.round(availabilityScore * weights.availability * 100) / 100,
        responseHistory: Math.round(historyScore * weights.responseHistory * 100) / 100,
      },
    };
  });

  return ranked.sort((a, b) => b.priorityScore - a.priorityScore);
}

module.exports = {
  getScoringWeights,
  rankDonors,
  scoreDistance,
  scoreEligibility,
  scoreAvailability,
  scoreResponseHistory,
};
