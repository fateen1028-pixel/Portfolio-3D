/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  allowedDevOrigins: ["oblivion-famished-falcon.ngrok-free.dev"],
  output: "export"
};

export default nextConfig;