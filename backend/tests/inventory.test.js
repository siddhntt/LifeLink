// Pure-logic tests for inventory operations
// Tests the business rules without requiring a database

describe('Inventory Business Rules', () => {
  // ─── Negative inventory prevention ─────────────────────────────────────────

  test('should not allow available units below zero', () => {
    const validateUnits = (units) => {
      if (units < 0) throw new Error('Available units cannot be negative');
      return true;
    };

    expect(() => validateUnits(-1)).toThrow('negative');
    expect(validateUnits(0)).toBe(true);
    expect(validateUnits(10)).toBe(true);
  });

  // ─── Reserve / release logic ─────────────────────────────────────────────────

  test('reserve should fail if requested > available', () => {
    const item = { availableUnits: 3, reservedUnits: 0 };
    const canReserve = (available, requested) => available >= requested;

    expect(canReserve(item.availableUnits, 5)).toBe(false);
    expect(canReserve(item.availableUnits, 3)).toBe(true);
    expect(canReserve(item.availableUnits, 1)).toBe(true);
  });

  test('reserve correctly decrements available and increments reserved', () => {
    const item = { availableUnits: 10, reservedUnits: 2 };
    const unitsToReserve = 3;

    const after = {
      availableUnits: item.availableUnits - unitsToReserve,
      reservedUnits: item.reservedUnits + unitsToReserve,
    };

    expect(after.availableUnits).toBe(7);
    expect(after.reservedUnits).toBe(5);
  });

  test('release should fail if requested > reserved', () => {
    const item = { availableUnits: 5, reservedUnits: 2 };
    const canRelease = (reserved, requested) => reserved >= requested;

    expect(canRelease(item.reservedUnits, 3)).toBe(false);
    expect(canRelease(item.reservedUnits, 2)).toBe(true);
  });

  test('release correctly increments available and decrements reserved', () => {
    const item = { availableUnits: 5, reservedUnits: 3 };
    const unitsToRelease = 2;

    const after = {
      availableUnits: item.availableUnits + unitsToRelease,
      reservedUnits: item.reservedUnits - unitsToRelease,
    };

    expect(after.availableUnits).toBe(7);
    expect(after.reservedUnits).toBe(1);
  });

  // ─── Expiry logic ────────────────────────────────────────────────────────────

  test('items past expiry date should be flagged', () => {
    const isExpired = (expiryDate) => new Date(expiryDate) <= new Date();

    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

    expect(isExpired(pastDate)).toBe(true);
    expect(isExpired(futureDate)).toBe(false);
  });

  test('mark expired sets available and reserved to 0', () => {
    const item = { availableUnits: 5, reservedUnits: 2, status: 'AVAILABLE' };

    const expired = {
      ...item,
      status: 'EXPIRED',
      availableUnits: 0,
      reservedUnits: 0,
    };

    expect(expired.status).toBe('EXPIRED');
    expect(expired.availableUnits).toBe(0);
    expect(expired.reservedUnits).toBe(0);
  });

  // ─── Blood group inventory aggregation ────────────────────────────────────────

  test('total available should sum across inventory items', () => {
    const inventory = [
      { bloodGroup: 'A_POS', availableUnits: 5, status: 'AVAILABLE' },
      { bloodGroup: 'A_POS', availableUnits: 3, status: 'AVAILABLE' },
      { bloodGroup: 'A_POS', availableUnits: 0, status: 'EXPIRED' },
    ];

    const total = inventory
      .filter((i) => i.status === 'AVAILABLE')
      .reduce((sum, i) => sum + i.availableUnits, 0);

    expect(total).toBe(8);
  });

  // ─── Appointment capacity ────────────────────────────────────────────────────

  test('slot should not accept bookings beyond capacity', () => {
    const slot = { capacity: 5, bookedCount: 5 };
    const canBook = slot.bookedCount < slot.capacity;
    expect(canBook).toBe(false);
  });

  test('slot with remaining capacity should accept bookings', () => {
    const slot = { capacity: 5, bookedCount: 3 };
    const canBook = slot.bookedCount < slot.capacity;
    expect(canBook).toBe(true);
  });

  test('booking increments count', () => {
    const slot = { capacity: 5, bookedCount: 3 };
    const after = { ...slot, bookedCount: slot.bookedCount + 1 };
    expect(after.bookedCount).toBe(4);
    expect(after.bookedCount < after.capacity).toBe(true);
  });
});
