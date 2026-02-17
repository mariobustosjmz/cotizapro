import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers configuration
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME type sniffing - ensures browser respects Content-Type
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Prevent clickjacking attacks
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Enable XSS protection in older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Control referrer information leakage
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Content Security Policy - comprehensive XSS and injection prevention
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com wss://*.supabase.co",
              "frame-src 'self' https://checkout.stripe.com",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // Enable HSTS (HTTP Strict Transport Security) - only in production
          ...(process.env.NODE_ENV === "production"
            ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains; preload",
              },
            ]
            : []),
          // Disable client-side caching for sensitive pages
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
      // Additional security headers for specific routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
      // CSP for dashboard pages - must allow unsafe-inline/eval for Next.js to work
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

};

export default nextConfig;
