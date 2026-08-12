import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@sim': path.resolve(__dirname, './src/simulation'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
          'simulation-core': [
            './src/core/model.ts',
            './src/core/matrix.ts',
            './src/core/define.ts',
            './src/core/registry.ts',
            './src/core/netlist.ts',
            './src/core/solver.ts',
            './src/core/erc.ts',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
    exclude: ['monaco-editor/esm/vs/editor/editor.worker'],
  },
  worker: {
    format: 'es',
    plugins: [react()],
  },
});