import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Tăng giới hạn cảnh báo chunk size lên 1000 kB
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Tách các thư viện vendor lớn thành chunk riêng
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },

  // Proxy API calls tới backend trong dev (tránh CORS khi dev local)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
