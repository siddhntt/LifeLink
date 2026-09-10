const prisma = require('../config/database');
const { AppError } = require('../utils/helpers');

async function addInventory(bloodBankId, data) {
  return prisma.bloodInventory.create({
    data: { bloodBankId, ...data },
  });
}

async function updateInventory(inventoryId, bloodBankId, data) {
  const item = await prisma.bloodInventory.findFirst({
    where: { id: inventoryId, bloodBankId },
  });
  if (!item) throw new AppError('Inventory item not found', 404, 'NOT_FOUND');

  if (data.availableUnits !== undefined && data.availableUnits < 0) {
    throw new AppError('Available units cannot be negative', 400, 'INVALID_QUANTITY');
  }

  const updated = await prisma.bloodInventory.update({
    where: { id: inventoryId },
    data,
  });

  await prisma.bloodBank.update({
    where: { id: bloodBankId },
    data: { inventoryUpdatedAt: new Date() },
  });

  return updated;
}

async function reserveUnits(inventoryId, bloodBankId, units) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.bloodInventory.findFirst({
      where: { id: inventoryId, bloodBankId, status: 'AVAILABLE' },
    });

    if (!item) throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
    if (item.availableUnits < units) {
      throw new AppError('Insufficient available units', 400, 'INSUFFICIENT_UNITS');
    }

    return tx.bloodInventory.update({
      where: { id: inventoryId },
      data: {
        availableUnits: { decrement: units },
        reservedUnits: { increment: units },
      },
    });
  });
}

async function releaseUnits(inventoryId, bloodBankId, units) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.bloodInventory.findFirst({
      where: { id: inventoryId, bloodBankId },
    });

    if (!item) throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
    if (item.reservedUnits < units) {
      throw new AppError('Insufficient reserved units', 400, 'INSUFFICIENT_UNITS');
    }

    return tx.bloodInventory.update({
      where: { id: inventoryId },
      data: {
        availableUnits: { increment: units },
        reservedUnits: { decrement: units },
      },
    });
  });
}

async function markExpired(inventoryId, bloodBankId) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.bloodInventory.findFirst({
      where: { id: inventoryId, bloodBankId },
    });
    if (!item) throw new AppError('Inventory item not found', 404, 'NOT_FOUND');

    return tx.bloodInventory.update({
      where: { id: inventoryId },
      data: { status: 'EXPIRED', availableUnits: 0, reservedUnits: 0 },
    });
  });
}

async function searchAvailability(bloodGroup, latitude, longitude, radiusKm) {
  const { haversineDistance } = require('../utils/distance');

  const bloodBanks = await prisma.bloodBank.findMany({
    where: { verificationStatus: 'VERIFIED' },
    include: {
      inventory: {
        where: { bloodGroup, status: 'AVAILABLE', availableUnits: { gt: 0 } },
      },
    },
  });

  return bloodBanks
    .map((bank) => {
      const distanceKm = haversineDistance(latitude, longitude, bank.latitude, bank.longitude);
      const totalAvailable = bank.inventory.reduce((sum, i) => sum + i.availableUnits, 0);
      return {
        id: bank.id,
        name: bank.name,
        city: bank.city,
        latitude: bank.latitude,
        longitude: bank.longitude,
        contactPhone: bank.contactPhone,
        distanceKm,
        totalAvailable,
        availableUnits: totalAvailable,
        inventory: bank.inventory,
        lastUpdated: bank.inventoryUpdatedAt,
        inventoryUpdatedAt: bank.inventoryUpdatedAt,
      };
    })
    .filter((b) => b.distanceKm !== null && b.distanceKm <= radiusKm && b.totalAvailable > 0)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = {
  addInventory,
  updateInventory,
  reserveUnits,
  releaseUnits,
  markExpired,
  searchAvailability,
};
