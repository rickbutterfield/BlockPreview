const prompt = require('prompt');
const fs = require('fs');
const { execSync } = require('child_process');

// The test site listens on its own port in each git worktree (Umbraco.Community.WorktreeDevPort).
// `git wdp-port` prints this worktree's port once the site has run; 44355 is the main checkout's.
function defaultBaseUrl() {
  try {
    const port = execSync('git wdp-port', { encoding: 'utf8' }).trim();
    if (port) return `https://localhost:${port}`;
  } catch {}
  return 'https://localhost:44355';
}
const defaultUrl = defaultBaseUrl();

const properties = [
  {
    description: 'Enter your superadmin username/email',
    name: 'username',
    required: true
  },
  {
    description: 'Enter your superadmin password',
    name: 'password',
    hidden: true,
    required: true
  },
  {
    description: `Enter CMS URL, or leave empty for default value of "${defaultUrl}"`,
    name: 'baseUrl'
  }
];

const configPath = './.env'

console.log("Configure your test environment")

prompt.start();

prompt.get(properties, function (error, result) {
  if (error) { return onError(error); }

  var fileContent = `UMBRACO_USER_LOGIN=${result.username}
UMBRACO_USER_PASSWORD=${result.password}
URL=${result.baseUrl || defaultUrl}`;

  fs.writeFile(configPath, fileContent, function (error) {
    if (error) return console.error(error);
    console.log('Configuration saved');
  });
});

function onError(error) {
  console.error(error);
  return true;
}
