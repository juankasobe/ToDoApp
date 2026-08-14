import { spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const cmdMetaCharacters = /([()\][%!^"`<>&|;, *?])/g;

function escapeCmdArgument(argument) {
  const escapedQuotes = argument.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
  const escapedTrailingBackslashes = escapedQuotes.replace(/(?=(\\+?)?)\1$/, '$1$1');

  return `"${escapedTrailingBackslashes}"`
    .replace(cmdMetaCharacters, '^$1')
    .replace(cmdMetaCharacters, '^$1');
}

export function createGradleInvocation(platform, args, temporaryWrapper, comspec = process.env.ComSpec ?? process.env.COMSPEC ?? 'cmd.exe') {
  if (platform !== 'win32') {
    return { command: 'sh', args: [temporaryWrapper, ...args] };
  }

  const shellCommand = ['gradlew.bat', ...args.map(escapeCmdArgument)].join(' ');

  return {
    command: comspec,
    args: ['/d', '/s', '/v:off', '/c', `"${shellCommand}"`],
    windowsVerbatimArguments: true,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const isWindows = process.platform === 'win32';
  const temporaryWrapper = `.gradlew-lf-${process.pid}`;
  const invocation = createGradleInvocation(process.platform, process.argv.slice(2), temporaryWrapper);
  let result;

  try {
    if (!isWindows) {
      const wrapper = readFileSync('android/gradlew', 'utf8').replaceAll('\r\n', '\n');
      writeFileSync(`android/${temporaryWrapper}`, wrapper);
    }

    result = spawnSync(invocation.command, invocation.args, {
      cwd: 'android',
      stdio: 'inherit',
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    });
  } finally {
    if (!isWindows) {
      try {
        unlinkSync(`android/${temporaryWrapper}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
