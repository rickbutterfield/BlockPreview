import { execSync } from "node:child_process";

// The test site listens on its own port in each git worktree (Umbraco.Community.WorktreeDevPort).
// `git wdp-port` prints this worktree's port once the site has run; 44355 is the main checkout's.
function worktreePort(): string {
  try {
    return execSync("git wdp-port", { encoding: "utf8" }).trim() || "44355";
  } catch {
    return "44355";
  }
}

const umbracoConfig = {
  environment: {
    baseUrl: process.env.URL || `https://localhost:${worktreePort()}`
  },
  user: {
    login: process.env.UMBRACO_USER_LOGIN,
    password: process.env.UMBRACO_USER_PASSWORD
  }
};

export { umbracoConfig };
