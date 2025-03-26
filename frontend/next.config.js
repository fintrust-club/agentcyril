/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com', 'lh3.googleusercontent.com', 'localhost', 'svelte.dev', 'tailwindcss.com'],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  },
  transpilePackages: ['@uiw/react-md-editor'],
  webpack: (config) => {
    // This is required for the @uiw/react-md-editor package
    config.resolve.alias = {
      ...config.resolve.alias,
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
    };
    return config;
  },
  // Needed for markdown preview and authentication
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: blob: https://lh3.googleusercontent.com; " +
              "connect-src 'self' " + process.env.NEXT_PUBLIC_BACKEND_URL + " https://*.supabase.co https://api.openai.com " +
              "https://fonts.googleapis.com https://fonts.gstatic.com; " +
              "frame-ancestors 'none';"
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig; 