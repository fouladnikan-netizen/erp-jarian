import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@domain': path.resolve(rootDir, 'src/domain'),
      '@api': path.resolve(rootDir, 'src/api'),
      '@shared': path.resolve(rootDir, 'src/shared'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // کلاینت فقط با بک‌اند خودمان حرف می‌زند؛ کلید API هرگز به مرورگر نمی‌رسد
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/domain/**',
        'src/modules/nabz/services/**',
        'src/modules/nabz/orderStageService.js',
        'src/shared/utils/**',
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      // Thresholds deferred — see Docs/architecture/QUALITY_ENGINEERING.md
    },
  },
});
