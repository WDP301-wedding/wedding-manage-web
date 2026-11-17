import { z } from 'zod';

const percentage = z.int().min(10).max(100);
export function contractDepositRate(document: unknown): number {
  return z.object({ depositRate: percentage.optional() }).parse(document).depositRate ?? 30;
}
export function restaurantDepositPercentage(profile: unknown): number {
  return (
    z.object({ depositPercentage: percentage.optional() }).parse(profile).depositPercentage ?? 30
  );
}
