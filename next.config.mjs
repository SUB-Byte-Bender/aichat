/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['onnxruntime-node', '@huggingface/transformers'],
        outputFileTracingIncludes: {
            '/*': ['./Ulalas Personas/**/*'],
            '/api/**/*': ['./Ulalas Personas/**/*'],
        },
    },
    transpilePackages: ['lucide-react'],
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Prevent webpack from bundling native .node binaries and WASM files
            config.externals = config.externals || [];
            config.externals.push({
                'onnxruntime-node': 'commonjs onnxruntime-node',
                '@huggingface/transformers': 'commonjs @huggingface/transformers',
            });
        }
        return config;
    },
};

export default nextConfig;

