const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable ESLint during builds for better code quality
  eslint: {
    // Only ignore during builds if absolutely necessary
    // Set to false to enforce linting in production
    ignoreDuringBuilds: false,
    // Specify directories to lint
    dirs: ['src/app', 'src/components', 'src/lib'],
  },
  // Enable TypeScript type checking for production builds
  typescript: {
    // Enable type checking to catch errors before deployment
    // Set to false to enforce strict type checking
    ignoreBuildErrors: false,
  },
 images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },

  // Add headers for CORS
  async headers() {
    return [
      {
        // Apply these headers to API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Production would need specific domains
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,X-Requested-With" },
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    // Handle specific issues with NodeMailer and Node.js modules on the client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        http2: false,
        util: false,
        stream: false,
        events: false,
        process: false,
        path: false,
        zlib: false,
        crypto: false,
      };

      // Handle node: scheme imports
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:events': 'events',
        'node:stream': 'stream-browserify',
        'node:util': 'util',
        'node:process': 'process/browser',
      };
    }

    return config;
  },
  // Ignore specific pages/files that are causing build errors
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transpilePackages: ['@chakra-ui/react'],
  // Handle problematic aliases
  experimental: {
    esmExternals: 'loose',
    
   
  },
  // Add rewrites for problematic pages to ensure they're handled statically
  async rewrites() {
    return [
      // Support pages
      {
        source: '/support/faq',
        destination: '/support'
      },
      {
        source: '/support/forum',
        destination: '/support'
      },
      {
        source: '/support/contact',
        destination: '/support'
      }
    ];
  },
  // Handle all redirects in one function
  async redirects() {
    return [
      // Admin redirects
      {
        source: '/admin/dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      // Add redirect for system status
      {
        source: '/status',
        destination: '/system-status',
        permanent: true,
      },
      {
        source: '/support/system-status',
        destination: '/system-status',
        permanent: true,
      },
      {
        source: '/admin/analytics',
        destination: '/analytics',
        permanent: true,
      },
      {
        source: '/admin/blog',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/admin/knowledge',
        destination: '/knowledge',
        permanent: true,
      },
      {
        source: '/admin/knowledge/new',
        destination: '/knowledge/new',
        permanent: true,
      },
      {
        source: '/admin/knowledge/:id*',
        destination: '/knowledge/:id*',
        permanent: true,
      },
      {
        source: '/admin/users',
        destination: '/users',
        permanent: true,
      },
      {
        source: '/admin/settings',
        destination: '/settings',
        permanent: true,
      },
      {
        source: '/admin/careers',
        destination: '/careers',
        permanent: true,
      },
      {
        source: '/admin/content',
        destination: '/content',
        permanent: true,
      },
      {
        source: '/admin/subscriptions',
        destination: '/subscriptions',
        permanent: true,
      },
      {
        source: '/admin/support',
        destination: '/support',
        permanent: true,
      },
      {
        source: '/admin/todo',
        destination: '/todo',
        permanent: true,
      },
      // Marketing route group redirects
      {
        source: '/home/integrations',
        destination: '/integrations',
        permanent: true,
      },
      // Removed the incorrect integrations redirect
      // Fallback redirect for any other admin pages
      {
        source: '/admin/:path*',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
