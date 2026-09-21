import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const nextConfig = { poweredByHeader: false, outputFileTracingRoot: root, turbopack: { root } };
export default nextConfig;
