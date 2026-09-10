const prisma = require('../config/database');

const DEFAULT_RULES = {
  minAge: 18,
  maxAge: 65,
  minWeight: 45,
  minDonationIntervalDays: 90,
  deferralConditions: ['recent_surgery', 'recent_illness', 'pregnancy'],
};

async function getRules() {
  const dbRules = await prisma.eligibilityRule.findMany({ where: { isActive: true } });
  const rules = { ...DEFAULT_RULES };

  for (const rule of dbRules) {
    rules[rule.key] = rule.value;
  }

  return rules;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function daysSince(date) {
  if (!date) return Infinity;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function evaluateDonor(donorProfile) {
  const rules = await getRules();
  const reasons = [];

  const age = calculateAge(donorProfile.dateOfBirth);
  if (age === null) {
    reasons.push('Date of birth not provided');
  } else if (age < rules.minAge) {
    reasons.push(`Minimum age requirement: ${rules.minAge} years`);
  } else if (age > rules.maxAge) {
    reasons.push(`Maximum age limit: ${rules.maxAge} years`);
  }

  if (!donorProfile.weight) {
    reasons.push('Weight not provided');
  } else if (donorProfile.weight < rules.minWeight) {
    reasons.push(`Minimum weight requirement: ${rules.minWeight} kg`);
  }

  if (!donorProfile.bloodGroup) {
    reasons.push('Blood group not specified');
  }

  const daysSinceDonation = daysSince(donorProfile.lastDonationDate);
  if (daysSinceDonation < rules.minDonationIntervalDays) {
    const remaining = rules.minDonationIntervalDays - daysSinceDonation;
    reasons.push(`Must wait ${remaining} more days since last donation`);
  }

  let status = 'ELIGIBLE';
  if (reasons.some((r) => r.includes('not provided') || r.includes('not specified'))) {
    status = 'NEEDS_MEDICAL_REVIEW';
  } else if (reasons.length > 0) {
    status = 'TEMPORARILY_UNAVAILABLE';
  }

  const nextEligibleDate =
    daysSinceDonation < rules.minDonationIntervalDays && donorProfile.lastDonationDate
      ? new Date(
          new Date(donorProfile.lastDonationDate).getTime() +
            rules.minDonationIntervalDays * 24 * 60 * 60 * 1000
        )
      : null;

  return {
    status,
    reasons,
    nextEligibleDate,
    age,
    daysSinceLastDonation: daysSinceDonation === Infinity ? null : daysSinceDonation,
    disclaimer:
      'This eligibility assessment is informational only and does not replace professional medical evaluation.',
  };
}

async function updateDonorEligibility(donorProfileId) {
  const profile = await prisma.donorProfile.findUnique({ where: { id: donorProfileId } });
  if (!profile) return null;

  const evaluation = await evaluateDonor(profile);

  return prisma.donorProfile.update({
    where: { id: donorProfileId },
    data: {
      eligibilityStatus: evaluation.status,
      eligibilityReason: evaluation.reasons.join('; ') || null,
      eligibilityCheckedAt: new Date(),
    },
  });
}

module.exports = {
  getRules,
  evaluateDonor,
  updateDonorEligibility,
  calculateAge,
  daysSince,
  DEFAULT_RULES,
};
