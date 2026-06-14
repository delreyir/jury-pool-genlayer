/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0x6e638a22453e43a93915BA9619801E61860296Da" },
};
module.exports = nextConfig;
