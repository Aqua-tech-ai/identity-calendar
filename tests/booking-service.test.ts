import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createBooking } from '../lib/booking-service';
import { prisma } from '../lib/prisma';
import { ConflictError } from '../lib/errors';

describe('createBooking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws ConflictError when slot becomes unavailable during booking', async () => {
    const mockSlot = {
      id: 'slot-1',
      status: 'available',
      booking: null,
      isPaidSlot: false,
    };

    const tx = {
      slot: {
        findUnique: vi.fn().mockResolvedValue(mockSlot),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      booking: {
        create: vi.fn(),
      },
    };

    const transactionSpy = vi
      .spyOn(prisma, '$transaction')
      .mockImplementation(async (callback: any) => {
        return callback(tx);
      });

    await expect(
      createBooking({
        slotId: 'slot-1',
        playerName: 'Tester',
        identityVId: '12345678',
        discordId: 'tester#0001',
        bookingType: 'PRACTICE',
        notes: 'test',
      }),
    ).rejects.toThrow(ConflictError);

    expect(transactionSpy).toHaveBeenCalled();
    expect(tx.slot.findUnique).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      include: { booking: true },
    });
    expect(tx.slot.updateMany).toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
    transactionSpy.mockRestore();
  });
});
