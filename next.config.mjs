const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.GITHUB_ACTIONS && repository ? `/${repository}` : '',
};

export default nextConfig;