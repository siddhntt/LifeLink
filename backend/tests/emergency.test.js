// Emergency workflow lifecycle tests — pure logic
// Tests the business rules and state machine of emergency requests

const { getCompatibleDonorGroups } = require('../src/utils/bloodCompatibility');
const { haversineDistance } = require('../src/utils/distance');

describe('Emergency Workflow Logic', () => {
  // ─── Request validation ────────────────────────────────────────────────────

  test('only VERIFIED hospitals can create emergency requests', () => {
    const canCreate = (hospital) => hospital.verificationStatus === 'VERIFIED';

    expect(canCreate({ verificationStatus: 'VERIFIED' })).toBe(true);
    expect(canCreate({ verificationStatus: 'PENDING' })).toBe(false);
    expect(canCreate({ verificationStatus: 'REJECTED' })).toBe(false);
  });

  // ─── Donor filtering pipeline ─────────────────────────────────────────────

  test('filter pipeline excludes ineligible donors', () => {
    const donors = [
      { id: '1', bloodGroup: 'O_POS', eligibilityStatus: 'ELIGIBLE', availability: 'AVAILABLE', accountStatus: 'ACTIVE' },
      { id: '2', bloodGroup: 'O_POS', eligibilityStatus: 'TEMPORARILY_UNAVAILABLE', availability: 'AVAILABLE', accountStatus: 'ACTIVE' },
      { id: '3', bloodGroup: 'O_POS', eligibilityStatus: 'ELIGIBLE', availability: 'NOT_AVAILABLE', accountStatus: 'ACTIVE' },
      { id: '4', bloodGroup: 'B_POS', eligibilityStatus: 'ELIGIBLE', availability: 'AVAILABLE', accountStatus: 'ACTIVE' },
      { id: '5', bloodGroup: 'O_POS', eligibilityStatus: 'ELIGIBLE', availability: 'AVAILABLE', accountStatus: 'SUSPENDED' },
    ];

    const requestedGroup = 'A_POS'; // O_POS can donate to A_POS
    const compatible = getCompatibleDonorGroups(requestedGroup);

    const filtered = donors.filter((d) =>
      compatible.includes(d.bloodGroup) &&
      d.eligibilityStatus === 'ELIGIBLE' &&
      d.availability === 'AVAILABLE' &&
      d.accountStatus === 'ACTIVE'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  // ─── Radius expansion stages ──────────────────────────────────────────────

  test('radius stages expand in correct order', () => {
    const stages = [
      { stage: 0, radiusKm: 5 },
      { stage: 1, radiusKm: 10 },
      { stage: 2, radiusKm: 20 },
      { stage: 3, radiusKm: 50 },
    ];

    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].radiusKm).toBeGreaterThan(stages[i - 1].radiusKm);
    }
  });

  test('donors within current radius are selected', () => {
    const hospitalLat = 19.076;
    const hospitalLng = 72.8777;
    const radiusKm = 10;

    const donors = [
      { id: '1', latitude: 19.076, longitude: 72.8777 },    // 0km — in range
      { id: '2', latitude: 19.08, longitude: 72.88 },       // ~0.5km — in range
      { id: '3', latitude: 19.2, longitude: 73.0 },         // ~17km — out of range
      { id: '4', latitude: 20.0, longitude: 73.0 },         // ~105km — out of range
    ];

    const inRange = donors.filter((d) => {
      const dist = haversineDistance(hospitalLat, hospitalLng, d.latitude, d.longitude);
      return dist <= radiusKm;
    });

    expect(inRange).toHaveLength(2);
    expect(inRange.map((d) => d.id)).toEqual(['1', '2']);
  });

  // ─── Duplicate notification prevention ────────────────────────────────────

  test('previously notified donors are excluded in expansion', () => {
    const allDonors = ['d1', 'd2', 'd3', 'd4', 'd5'];
    const alreadyNotified = new Set(['d1', 'd2', 'd3']);

    const newDonors = allDonors.filter((d) => !alreadyNotified.has(d));

    expect(newDonors).toEqual(['d4', 'd5']);
  });

  // ─── Request state machine ────────────────────────────────────────────────

  test('valid status transitions', () => {
    const validTransitions = {
      CREATED: ['SEARCHING', 'CANCELLED'],
      SEARCHING: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
      PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED', 'EXPIRED'],
      FULFILLED: [],
      CANCELLED: [],
      EXPIRED: [],
    };

    expect(validTransitions.CREATED).toContain('SEARCHING');
    expect(validTransitions.SEARCHING).toContain('FULFILLED');
    expect(validTransitions.FULFILLED).toHaveLength(0); // terminal state
    expect(validTransitions.CANCELLED).toHaveLength(0); // terminal state
  });

  test('acceptedUnits tracks progress toward fulfillment', () => {
    const request = { requiredUnits: 3, acceptedUnits: 0, status: 'SEARCHING' };

    // Simulate 3 acceptances
    let accepted = request.acceptedUnits;
    accepted += 1; // donor 1 accepts
    expect(accepted).toBe(1);

    accepted += 1; // donor 2 accepts
    expect(accepted).toBe(2);

    accepted += 1; // donor 3 accepts
    expect(accepted).toBe(3);

    const isFulfilled = accepted >= request.requiredUnits;
    expect(isFulfilled).toBe(true);
  });

  // ─── Duplicate request detection ──────────────────────────────────────────

  test('duplicate detection matches same hospital+bloodGroup within timeframe', () => {
    const existing = {
      hospitalId: 'h1',
      bloodGroup: 'O_POS',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    };

    const newRequest = {
      hospitalId: 'h1',
      bloodGroup: 'O_POS',
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isDuplicate =
      existing.hospitalId === newRequest.hospitalId &&
      existing.bloodGroup === newRequest.bloodGroup &&
      existing.createdAt > oneHourAgo;

    expect(isDuplicate).toBe(true);
  });

  test('different blood group is not a duplicate', () => {
    const existing = { hospitalId: 'h1', bloodGroup: 'O_POS' };
    const newRequest = { hospitalId: 'h1', bloodGroup: 'A_NEG' };

    const isDuplicate =
      existing.hospitalId === newRequest.hospitalId &&
      existing.bloodGroup === newRequest.bloodGroup;

    expect(isDuplicate).toBe(false);
  });

  // ─── Donor response tracking ──────────────────────────────────────────────

  test('response statuses progress correctly', () => {
    const validProgressions = {
      NOTIFIED: ['VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      VIEWED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
      ACCEPTED: ['ARRIVED', 'NO_SHOW'],
      ARRIVED: ['DONATION_COMPLETED'],
    };

    expect(validProgressions.NOTIFIED).toContain('ACCEPTED');
    expect(validProgressions.ACCEPTED).toContain('ARRIVED');
    expect(validProgressions.ACCEPTED).toContain('NO_SHOW');
    expect(validProgressions.ARRIVED).toContain('DONATION_COMPLETED');
  });

  test('response time is calculated correctly', () => {
    const notifiedAt = new Date('2024-01-01T10:00:00Z');
    const respondedAt = new Date('2024-01-01T10:05:00Z');
    const responseTimeMs = respondedAt - notifiedAt;

    expect(responseTimeMs).toBe(5 * 60 * 1000); // 5 minutes
  });
});
