# MCP (Model Context Protocol) Setup

This repository includes configuration for [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers, enabling AI tooling integration for Umbraco CMS development workflows.

## Overview

MCP allows AI assistants (like Claude) to interact with external tools and services. This repository configures two MCP servers:

| Server | Purpose | Package |
|--------|---------|---------|
| **umbraco-cms** | Manage Umbraco content types, documents, and media | `@umbraco-cms/mcp-dev@18` |
| **playwright** | Browser automation for testing and debugging | `@playwright/mcp@latest` |

## Quick Start

### 1. Start Umbraco Locally

Ensure your local Umbraco instance is running. The test site picks its own port per git worktree (Umbraco.Community.WorktreeDevPort): `https://localhost:44355` in the main checkout, or run `git wdp-port` in a worktree to find its port. Set `UMBRACO_BASE_URL` to match.

### 2. Configure the OAuth Client in Umbraco

The Umbraco MCP server requires an OAuth client configured in your Umbraco instance:

- **Client ID**: `umbraco-back-office-mcp`
- **Client Secret**: A secure secret of your choice
- **Grant Type**: Client Credentials

The MCP server will prompt for these credentials when it connects. Set the following environment variables if you want to avoid prompts:

| Variable | Description | Example |
|----------|-------------|---------|
| `UMBRACO_CLIENT_ID` | OAuth client ID configured in Umbraco | `umbraco-back-office-mcp` |
| `UMBRACO_CLIENT_SECRET` | OAuth client secret (keep secure!) | `your-secure-secret` |
| `UMBRACO_BASE_URL` | URL of your local Umbraco instance | `https://localhost:44355` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` for self-signed certificates (local dev only) | `0` |
| `UMBRACO_INCLUDE_TOOL_COLLECTIONS` | Comma-separated list of tool collections to enable | `data-type,document-type,document` |

### Tool Collections

The `UMBRACO_INCLUDE_TOOL_COLLECTIONS` variable controls which Umbraco MCP tools are available:

- `data-type` - Manage data types (property editors)
- `document-type` - Manage document types (content types)
- `document` - Manage content/documents
- `media-type` - Manage media types
- `media` - Manage media items

## Security Considerations

> **Warning**: This configuration is for **local development only**.

### Self-Signed Certificates

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables SSL certificate validation. This is necessary for self-signed certificates in local development but:

- **Never use in production**
- Affects all HTTPS connections made by Node.js processes
- Consider trusting your local development certificate instead

### Client Secrets

- Never commit real secrets to source control
- Use strong, unique secrets even in development

## File Structure

```
BlockPreview-v5/
├── .mcp.json              # MCP server configuration
├── scripts/
│   └── mcp-launch.mjs     # Starts the npx-based servers on Windows, macOS and Linux
├── .claude/
│   ├── settings.json      # Shared Claude AI permissions (committed)
│   └── settings.local.json # Local Claude overrides (gitignored)
└── MCP.md                 # This documentation (you are here)
```

## Claude AI Permissions

The `.claude/settings.json` file configures which MCP tools Claude can use automatically without prompting. This is shared across the team for consistent developer experience.

### Customizing Permissions Locally

Create `.claude/settings.local.json` to override permissions for your environment:

```json
{
  "permissions": {
    "allow": [
      "mcp__umbraco__get-all-document-types"
    ]
  }
}
```

## Troubleshooting

### "Connection refused" errors

- Ensure Umbraco is running at the configured URL
- Check that the port matches your local setup

### "Unauthorized" errors

- Verify the OAuth client is configured in Umbraco
- Check that your client ID and secret match
- Ensure the client has appropriate permissions

### "Certificate" errors

- For local development, set `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Alternatively, trust your local development certificate

### MCP server not starting

- Ensure Node.js is installed (v22+ recommended)
- Run `npx @umbraco-cms/mcp-dev@18 --help` to verify the package works
- `.mcp.json` starts each server through `scripts/mcp-launch.mjs`, run with `node`. The script runs `npx` the right way on Windows (where it is `npx.cmd`) and on macOS and Linux. Don't change the `command` back to `cmd` or `npx`: each only works on some platforms.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Umbraco MCP Package](https://www.npmjs.com/package/@umbraco-cms/mcp-dev)
- [Playwright MCP](https://www.npmjs.com/package/@playwright/mcp)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
