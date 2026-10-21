import { defineConfig } from 'vite';

// GitHub Pages publica el sitio en /Apocalipsis-recorrido/
export default defineConfig({
  base: '/Apocalipsis-recorrido/',
  build: {
    // three.js pesa ~500 kB por sí solo; es esperado.
    chunkSizeWarningLimit: 800,
  },
});
