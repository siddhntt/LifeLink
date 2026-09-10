const { getCompatibleDonorGroups, isBloodCompatible } = require('../src/utils/bloodCompatibility');
const { haversineDistance } = require('../src/utils/distance');
const { DEFAULT_RULES } = require('../src/services/eligibilityService');
const { scoreDistance, scoreEligibility, scoreAvailability, scoreResponseHistory } = require('../src/services/scoringService');

// ─── Blood Compatibility Tests ─────────────────────────────────────────────────

describe('Blood Compatibility', () => {
  test('O- is universal donor for O-', () => {
    expect(isBloodCompatible('O_NEG', 'O_NEG')).toBe(true);
  });

  test('O- is universal donor — can donate to A+', () => {
    expect(isBloodCompatible('O_NEG', 'A_POS')).toBe(true);
  });

  test('B+ cannot donate to A+', () => {
    expect(isBloodCompatible('B_POS', 'A_POS')).toBe(false);
  });

  test('O+ can donate to A+', () => {
    expect(isBloodCompatible('O_POS', 'A_POS')).toBe(true);
  });

  test('AB+ accepts all groups (universal recipient)', () => {
    const compatible = getCompatibleDonorGroups('AB_POS');
    expect(compatible).toHaveLength(8);
  });

  test('O- only accepts O-', () => {
    const compatible = getCompatibleDonorGroups('O_NEG');
    expect(compatible).toEqual(['O_NEG']);
  });

  test('A+ accepts A+, A-, O+, O-', () => {
    const compatible = getCompatibleDonorGroups('A_POS');
    expect(compatible).toContain('A_POS');
    expect(compatible).toContain('A_NEG');
    expect(compatible).toContain('O_POS');
    expect(compatible).toContain('O_NEG');
    expect(compatible).not.toContain('B_POS');
    expect(compatible).not.toContain('AB_POS');
  });

  test('B- accepts B- and O-', () => {
    const compatible = getCompatibleDonorGroups('B_NEG');
    expect(compatible).toContain('B_NEG');
    expect(compatible).toContain('O_NEG');
    expect(compatible).not.toContain('A_POS');
  });

  test('AB- accepts all negative groups and AB-', () => {
    const compatible = getCompatibleDonorGroups('AB_NEG');
    expect(compatible).toContain('A_NEG');
    expect(compatible).toContain('B_NEG');
    expect(compatible).toContain('AB_NEG');
    expect(compatible).toContain('O_NEG');
    expect(compatible).not.toContain('A_POS');
  });
});

// ─── Haversine Distance Tests ───────────────────────────────────────────────────

describe('Haversine Distance', () => {
  test('same point returns 0', () => {
    expect(haversineDistance(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
  });

  test('calculates distance between Mumbai and Delhi approximately', () => {
    const distance = haversineDistance(19.076, 72.8777, 28.6139, 77.209);
    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });

  test('calculates short distance (within a city)', () => {
    const distance = haversineDistance(19.076, 72.8777, 19.12, 72.91);
    expect(distance).toBeGreaterThan(3);
    expect(distance).toBeLessThan(10);
  });

  test('handles null coordinates gracefully', () => {
    const distance = haversineDistance(null, null, 19.076, 72.8777);
    expect(distance).toBeNull();
  });

  test('handles zero coordinates', () => {
    const distance = haversineDistance(0, 0, 0, 0);
    expect(distance).toBe(0);
  });
});

// ─── Default Rules Tests ────────────────────────────────────────────────────────

describe('Default Rules', () => {
  test('has expected default values', () => {
    expect(DEFAULT_RULES.minAge).toBe(18);
    expect(DEFAULT_RULES.minDonationIntervalDays).toBe(90);
  });

  test('has max age', () => {
    expect(DEFAULT_RULES.maxAge).toBe(65);
  });

  test('has minimum weight', () => {
    expect(DEFAULT_RULES.minWeight).toBe(45);
  });

  test('has deferral conditions array', () => {
    expect(Array.isArray(DEFAULT_RULES.deferralConditions)).toBe(true);
    expect(DEFAULT_RULES.deferralConditions.length).toBeGreaterThan(0);
  });
});

// ─── Donor Scoring (pure functions — no DB) ─────────────────────────────────────

describe('Donor Scoring — Pure Functions', () => {
  test('closer donors score higher on distance', () => {
    expect(scoreDistance(1, 50)).toBeGreaterThan(scoreDistance(25, 50));
  });

  test('eligible donors score higher', () => {
    expect(scoreEligibility('ELIGIBLE')).toBeGreaterThan(scoreEligibility('TEMPORARILY_UNAVAILABLE'));
  });

  test('distance score at max radius is 0', () => {
    expect(scoreDistance(50, 50)).toBe(0);
  });

  test('distance score at 0 km is 100', () => {
    // scoreDistance returns a 0–100 scale
    expect(scoreDistance(0, 50)).toBe(100);
  });

  test('distance score at half radius is 50', () => {
    expect(scoreDistance(25, 50)).toBe(50);
  });

  test('null distance returns 0', () => {
    expect(scoreDistance(null, 50)).toBe(0);
  });

  test('eligible status returns max score', () => {
    expect(scoreEligibility('ELIGIBLE')).toBe(100);
  });

  test('temporarily unavailable returns 0', () => {
    expect(scoreEligibility('TEMPORARILY_UNAVAILABLE')).toBe(0);
  });

  test('needs medical review returns partial score', () => {
    expect(scoreEligibility('NEEDS_MEDICAL_REVIEW')).toBe(30);
  });

  test('unknown eligibility returns 0', () => {
    expect(scoreEligibility('UNKNOWN_STATUS')).toBe(0);
  });

  test('available donor scores 100', () => {
    expect(scoreAvailability('AVAILABLE')).toBe(100);
  });

  test('unavailable donor scores 0', () => {
    expect(scoreAvailability('NOT_AVAILABLE')).toBe(0);
  });

  test('first-time donor gets 50 for history', () => {
    expect(scoreResponseHistory({ responseCount: 0, acceptCount: 0 })).toBe(50);
  });

  test('donor with perfect accept rate scores high', () => {
    const score = scoreResponseHistory({ responseCount: 10, acceptCount: 10, avgResponseTimeMs: 30000 });
    expect(score).toBeGreaterThan(80);
  });

  test('donor with low accept rate scores lower', () => {
    const highScore = scoreResponseHistory({ responseCount: 10, acceptCount: 10 });
    const lowScore = scoreResponseHistory({ responseCount: 10, acceptCount: 2 });
    expect(highScore).toBeGreaterThan(lowScore);
  });

  test('fast response time gets bonus', () => {
    const fast = scoreResponseHistory({ responseCount: 5, acceptCount: 3, avgResponseTimeMs: 30000 });
    const slow = scoreResponseHistory({ responseCount: 5, acceptCount: 3, avgResponseTimeMs: 500000 });
    expect(fast).toBeGreaterThan(slow);
  });

  test('history score capped at 100', () => {
    const score = scoreResponseHistory({ responseCount: 100, acceptCount: 100, avgResponseTimeMs: 1000 });
    expect(score).toBeLessThanOrEqual(100);
  });
});
