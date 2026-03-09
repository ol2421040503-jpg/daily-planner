import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 使用相对路径，确保 Electron file:// 协议能正确加载资源
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      overlay: true,
      path: '/hot/vite-hmr',
      port: 6000,
      clientPort: 443,
      timeout: 30000,
    },
  },
});
