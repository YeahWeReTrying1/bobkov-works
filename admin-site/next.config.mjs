/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3000/api/:path*"
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:3000/uploads/:path*"
      }
    ];
  }
};

export default nextConfig;
