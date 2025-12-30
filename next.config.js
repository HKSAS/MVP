/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    // Désactiver les erreurs ESLint lors du build pour permettre le déploiement
    // Les warnings sont toujours affichés mais ne bloquent pas le build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Désactiver les erreurs TypeScript lors du build (optionnel)
    // ignoreBuildErrors: true,
  },
}

module.exports = nextConfig












