import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    debug: true,
    input: 'http://localhost:26294/umbraco/openapi/block-preview.json',
    output: {
        path: 'src/api',
    },
    plugins: [
        {
            name: '@hey-api/client-fetch',
            exportFromIndex: true,
            throwOnError: true,
        },
        {
            name: '@hey-api/typescript',
            enums: 'typescript'
        },
        {
            name: '@hey-api/sdk',
            responseStyle: 'fields',
            operations: {
                strategy: 'byTags',
                container: 'class',
                containerName: { name: '{{name}}Service' },
            },
        }
    ]
});