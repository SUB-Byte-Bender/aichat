/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        outputFileTracingIncludes: {
            '/*': ['./Ulalas Personas/**/*'],
            '/api/**/*': ['./Ulalas Personas/**/*'],
        },
    },
};

export default nextConfig;
