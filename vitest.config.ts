import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Component shadcn import bằng alias '@/…' như tsconfig.
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'app/page.tsx',
        'src/lib/**/*.ts',
        'src/features/booking-lifecycle/**/*.{ts,tsx}',
        'src/features/payments-billing/**/*.{ts,tsx}',
      ],
      exclude: ['src/**/*.test.{ts,tsx}'],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        branches: 80,
        lines: 80,
        perFile: true,
      },
    },
  },
});
