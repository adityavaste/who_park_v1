// lib/plans.ts
export type PlanType = 'BASIC_199' | 'PLUS_299' | 'BUSINESS_999';

export interface PlanConfig {
  id: PlanType;
  badge: string;
  shortName: string;
  priceInr: number;
  maxVehicles: number;
  includesPhysicalSticker: boolean;
  validityDays: number;
  features: string[];
}

export interface ShippingAddressInput {
  plateNumber?: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  BASIC_199: {
    id: 'BASIC_199',
    badge: 'Essential',
    shortName: 'WHO PARK Essential',
    priceInr: 199,
    maxVehicles: 1,
    includesPhysicalSticker: false,
    validityDays: 365,
    features: [
      'Register 1 vehicle (Car or Bike)',
      'Instant self-print QR windshield sticker',
      'Unlimited anonymous push alerts & WebRTC calls',
      'Valid for 1 full year (365 days)',
    ],
  },
  PLUS_299: {
    id: 'PLUS_299',
    badge: 'Most Popular',
    shortName: 'WHO PARK Plus + Sticker',
    priceInr: 299,
    maxVehicles: 3,
    includesPhysicalSticker: true,
    validityDays: 365,
    features: [
      'Register up to 3 family vehicles',
      '1 weather-proof physical QR sticker delivered free',
      'Instant self-print QRs for all 3 vehicles',
      'Unlimited anonymous alerts & calls for 1 year',
    ],
  },
  BUSINESS_999: {
    id: 'BUSINESS_999',
    badge: 'Business / Fleet',
    shortName: 'WHO PARK Business (10 Vehicles)',
    priceInr: 999,
    maxVehicles: 10,
    includesPhysicalSticker: false,
    validityDays: 365,
    features: [
      'Register up to 10 fleet or society vehicles',
      'Self-print QR stickers for all 10 vehicles',
      'Centralized alert & call dashboard',
      'Valid for 1 full year (365 days)',
    ],
  },
};

export function isPlanActive(user: {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): boolean {
  if (!user.plan || user.plan === 'NONE') return false;
  if (!user.planExpiresAt) return false;
  return new Date(user.planExpiresAt).getTime() > Date.now();
}

export function getAllowedVehicleLimit(user: {
  plan?: string | null;
  planExpiresAt?: Date | string | null;
}): number {
  if (!isPlanActive(user)) return 0;
  const planKey = user.plan as PlanType;
  return PLANS[planKey]?.maxVehicles ?? 0;
}

export function computeNewExpiryDate(
  currentExpiresAt?: Date | string | null,
  validityDays = 365
): Date {
  const now = Date.now();
  const existingTime = currentExpiresAt ? new Date(currentExpiresAt).getTime() : 0;
  const baseTime = existingTime > now ? existingTime : now;
  return new Date(baseTime + validityDays * 24 * 60 * 60 * 1000);
}