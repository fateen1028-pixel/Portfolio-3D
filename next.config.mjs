/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  allowedDevOrigins: ["oblivion-famished-falcon.ngrok-free.dev"],
};

export default nextConfig;