import { defineConfig } from '@hey-api/openapi-ts';
import { getPort } from 'worktree-dev-port';

export default defineConfig({
    debug: true,
    // The test site listens on this worktree's own port (see `git wdp-port`). Start it first:
    // getPort() throws if no port has been assigned yet. The site serves HTTPS, so Node must trust the
    // .NET dev certificate (`dotnet dev-certs https --trust`), or run this with NODE_TLS_REJECT_UNAUTHORIZED=0.
    input: `https://localhost:${getPort()}/umbraco/swagger/block-preview/swagger.json`,
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
            asClass: true,
            classNameBuilder: (name) => `${name}Service`,
            responseStyle: 'fields',
        }
    ]
});