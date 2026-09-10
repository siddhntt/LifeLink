const prisma = require('../config/database');
const { AppError } = require('../utils/helpers');
const { createNotification } = require('./notificationService');

async function bookAppointment(donorProfileId, slotId, notes) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.appointmentSlot.findUnique({
      where: { id: slotId },
      include: { bloodBank: true },
    });

    if (!slot || !slot.isActive) {
      throw new AppError('Slot not available', 400, 'SLOT_UNAVAILABLE');
    }

    if (slot.bookedCount >= slot.capacity) {
      throw new AppError('Slot is fully booked', 400, 'SLOT_FULL');
    }

    const existing = await tx.appointment.findFirst({
      where: {
        donorProfileId,
        slotId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existing) {
      throw new AppError('Already booked for this slot', 409, 'DUPLICATE_BOOKING');
    }

    const appointment = await tx.appointment.create({
      data: {
        donorProfileId,
        bloodBankId: slot.bloodBankId,
        slotId,
        notes,
        status: 'PENDING',
      },
      include: { slot: true, bloodBank: true },
    });

    await tx.appointmentSlot.update({
      where: { id: slotId },
      data: { bookedCount: { increment: 1 } },
    });

    const donor = await tx.donorProfile.findUnique({
      where: { id: donorProfileId },
      select: { userId: true },
    });

    await createNotification(
      donor.userId,
      'APPOINTMENT_CONFIRMATION',
      'Appointment Requested',
      `Your appointment at ${slot.bloodBank.name} on ${slot.date.toISOString().split('T')[0]} is pending confirmation.`
    );

    return appointment;
  });
}

async function updateAppointmentStatus(appointmentId, bloodBankId, status) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
      where: { id: appointmentId, bloodBankId },
      include: { slot: true, donorProfile: true },
    });

    if (!appointment) throw new AppError('Appointment not found', 404, 'NOT_FOUND');

    if (status === 'CANCELLED' && ['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      await tx.appointmentSlot.update({
        where: { id: appointment.slotId },
        data: { bookedCount: { decrement: 1 } },
      });
    }

    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    const donor = await tx.donorProfile.findUnique({
      where: { id: appointment.donorProfileId },
      select: { userId: true },
    });

    await createNotification(
      donor.userId,
      'APPOINTMENT_CONFIRMATION',
      `Appointment ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      `Your appointment status has been updated to ${status}.`
    );

    return updated;
  });
}

async function createSlot(bloodBankId, data) {
  return prisma.appointmentSlot.create({
    data: {
      bloodBankId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
    },
  });
}

module.exports = { bookAppointment, updateAppointmentStatus, createSlot };
