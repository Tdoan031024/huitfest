const nextConfig = {
  // Cho phép Pinggy truy cập vào hệ thống Dev (HMR - Live Reload) để React không bị chết lâm sàng
  allowedDevOrigins: [
    'xjmsn-14-226-167-209.run.pinggy-free.link', 
    'ryhjs-14-226-167-209.run.pinggy-free.link',
    'uuydb-14-226-167-209.run.pinggy-free.link',
    'paqql-14-226-167-209.run.pinggy-free.link',
    '*.run.pinggy-free.link',
    '*.pinggy-free.link',
    '127.0.0.1',
    '192.168.1.172',
    'localhost'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3005/api/:path*',
      },
      {
        source: '/assets/images/:path*',
        destination: 'http://localhost:3005/assets/images/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3005/uploads/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3005',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3005',
      },
      // Thêm pattern cho các link public cũ (nếu cần)
      {
        protocol: 'https',
        hostname: '*.run.pinggy-free.link',
      },
    ],
  },
};

module.exports = nextConfig;
