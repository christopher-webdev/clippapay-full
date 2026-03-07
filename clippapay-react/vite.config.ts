import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },  
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
    '/uploads': {
      target: 'http://localhost:5000', //http://clippapay.com', //
      changeOrigin: true,
      secure: false,
    },
  },
},
  build: {
    outDir: 'build',
    emptyOutDir: true, // clean build folder on each build
  },
});

