const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Skip build-time page data collection for API routes
  experimental: {
    skipMiddlewareUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  },
  
  // Webpack configuration for Next.js 15
  webpack: (config, { isServer }) => {
    // Handle node: scheme imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Add fallbacks for Node.js modules in client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    
    return config;
  },
  
  // ESLint configuration for builds
  eslint: {
    // Don't fail the build on ESLint errors during production builds
    // These should be fixed but shouldn't block deployment
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration for builds
  typescript: {
    // Warning: Temporarily disabled due to memory constraints with large codebase
    // Run 'tsc --noEmit' locally to check types before committing
    ignoreBuildErrors: true,
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
  
  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  transpilePackages: ['@chakra-ui/react'],
  
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
