// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://pengaduan.kemenag-baritoutara.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Baca .env.local dari root monorepo (satu env untuk FE + BE)
    envDir: '../',
    optimizeDeps: {
      include: ['xlsx', 'jspdf', 'jspdf-autotable'],
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});