// Starts an npx-based stdio MCP server the same way on Windows, macOS and Linux.
//
// `.mcp.json` runs this with `node`, which is a real executable on every platform. `npx` is not:
// on Windows it is `npx.cmd`, which Node can only start through a shell. Everything after this
// script's name is passed to npx unchanged, and stdin/stdout stay connected to the MCP client.
import { spawn } from 'node:child_process';

const windows = process.platform === 'win32';
const child = spawn(windows ? 'npx.cmd' : 'npx', process.argv.slice(2), { stdio: 'inherit', shell: windows });

child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
child.on('error', (error) => {
    console.error(`Could not start npx: ${error.message}`);
    process.exit(1);
});
