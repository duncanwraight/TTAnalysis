import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      output: {
        // PDF export loads these on the click; as one chunk they come to almost 1 MB
        manualChunks: (id) => {
          // Shared with the main bundle. Left alone, Rollup puts it in the jspdf
          // chunk, and then every page loads jspdf.
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'helpers';
          if (id.includes('node_modules/jspdf')) return 'jspdf';
          if (id.includes('node_modules/html2canvas')) return 'html2canvas';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});