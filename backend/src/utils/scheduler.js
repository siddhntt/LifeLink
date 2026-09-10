const cron = require('node-cron');
const prisma = require('../config/database');

function startScheduledJobs() {
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await prisma.emergencyRequest.updateMany({
        where: {
          status: { in: ['CREATED', 'SEARCHING', 'PARTIALLY_FULFILLED'] },
          expiresAt: { lte: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
      if (expired.count > 0) {
        console.log(`[Cron] Expired ${expired.count} emergency requests`);
      }
    } catch (err) {
      console.error('[Cron] Emergency expiry job failed:', err.message);
    }
  });

  cron.schedule('0 2 * * *', async () => {
    try {
      const expired = await prisma.bloodInventory.updateMany({
        where: {
          status: 'AVAILABLE',
          expiryDate: { lte: new Date() },
        },
        data: { status: 'EXPIRED', availableUnits: 0, reservedUnits: 0 },
      });
      if (expired.count > 0) {
        console.log(`[Cron] Marked ${expired.count} inventory items as expired`);
      }
    } catch (err) {
      console.error('[Cron] Inventory expiry job failed:', err.message);
    }
  });

  cron.schedule('0 9 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          slot: { date: { gte: tomorrow, lt: dayAfter } },
        },
        include: {
          donorProfile: { select: { userId: true } },
          bloodBank: { select: { name: true } },
          slot: true,
        },
      });

      for (const apt of appointments) {
        await prisma.notification.create({
          data: {
            userId: apt.donorProfile.userId,
            type: 'APPOINTMENT_REMINDER',
            title: 'Appointment Reminder',
            body: `Reminder: You have a donation appointment at ${apt.bloodBank.name} tomorrow.`,
          },
        });
      }
    } catch (err) {
      console.error('[Cron] Appointment reminder job failed:', err.message);
    }
  });

  // Weekly: clean up stale FCM device tokens (unused for 30+ days)
  cron.schedule('0 3 * * 0', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const removed = await prisma.deviceToken.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { lastUsedAt: { lt: thirtyDaysAgo } },
          ],
        },
      });
      if (removed.count > 0) {
        console.log(`[Cron] Cleaned up ${removed.count} stale FCM tokens`);
      }
    } catch (err) {
      console.error('[Cron] FCM token cleanup failed:', err.message);
    }
  });

  console.log('[Cron] Scheduled jobs started');
}

module.exports = { startScheduledJobs };
