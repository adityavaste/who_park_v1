// src/lib/plans.ts
export type PlanType = 'BASIC_199' | 'PLUS_299' | 'BUSINESS_999';

export interface ShippingAddressInput {
  plateNumber?: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export const PLANS: Record<
  PlanType,
  {
    id: PlanType;
    name: string;
    shortName: string;
    priceInr: number;
    amountPaise: number;
    maxVehicles: number;
    includesPhysicalSticker: boolean;
    badge: string;
    features: string[];
  }
> = {
  BASIC_199: {
    id: 'BASIC_199',
    name: 'WHO PARK Essential (1 Vehicle • 1 Year)',
    shortName: 'Essential • 1 Vehicle',
    priceInr: 199,
    amountPaise: 19900,
    maxVehicles: 1,
    includesPhysicalSticker: false,
    badge: 'Self-Print Instant',
    features: [
      '1 Vehicle protected for 1 full year',
      'Instant printable QR sticker PDF/PNG',
      'Unlimited scan alerts & 1-tap quick replies',
      'Private anonymous voice calls (3/day)',
    ],
  },
  PLUS_299: {
    id: 'PLUS_299',
    name: 'WHO PARK Plus (3 Vehicles + 1 Sticker Delivered • 1 Year)',
    shortName: 'Plus • 3 Vehicles + 1 Delivered',
    priceInr: 299,
    amountPaise: 29900,
    maxVehicles: 3,
    includesPhysicalSticker: true,
    badge: 'Most Popular • Free Delivery',
    features: [
      'Up to 3 Vehicles protected for 1 full year',
      '1 Weather-proof QR sticker delivered to your address',
      'Self-print stickers included for all 3 vehicles',
      'Keep same sticker on renewal — zero re-sticking',
    ],
  },
  BUSINESS_999: {
    id: 'BUSINESS_999',
    name: 'WHO PARK Business Fleet (30 Vehicles • 1 Year)',
    shortName: 'Business • 30 Vehicles',
    priceInr: 999,
    amountPaise: 99900,
    maxVehicles: 10,
    includesPhysicalSticker: false,
    badge: 'Fleet / Society / Commercial',
    features: [
      'Up to 30 Vehicles under one admin account',
      '1 full year validity (just ₹33/vehicle/year)',
      'Instant printable QR stickers for entire fleet',
      'Centralized alert & call logs across all vehicles',
    ],
  },
};

export function isPlanActive(user: {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): boolean {
  if (!user?.plan || user.plan === 'NONE' || user.plan === 'FREE') return false;
  if (!user.planExpiresAt) return false;
  return new Date(user.planExpiresAt).getTime() > Date.now();
}

export function getAllowedVehicleLimit(user: {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): number {
  if (!isPlanActive(user)) return 0;
  const cfg = PLANS[user.plan as PlanType];
  return cfg ? cfg.maxVehicles : 0;
}

/**
 * Extends expiry by 365 days from current expiry (if active) or from today (if expired/new),
 * so users upgrading mid-year from ₹199 -> ₹299 never lose remaining days.
 */
export function computeNewExpiryDate(currentExpiresAt?: Date | string | null): Date {
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const existing = currentExpiresAt ? new Date(currentExpiresAt).getTime() : 0;
  const baseTime = existing > now ? existing : now;
  return new Date(baseTime + oneYearMs);
}