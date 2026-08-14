import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createGradleInvocation } from './run-android-gradle.mjs';

test('constructs the Unix Gradle invocation without altering arguments', () => {
  assert.deepEqual(
    createGradleInvocation('linux', ['assemble Debug', '-Pmessage=one&two'], '.gradlew-lf-test'),
    {
      command: 'sh',
      args: ['.gradlew-lf-test', 'assemble Debug', '-Pmessage=one&two'],
    },
  );
});

test('constructs an injection-safe Windows Gradle invocation without altering arguments', () => {
  const invocation = createGradleInvocation('win32', [
    '',
    'assemble Debug',
    '-Pmessage=50% & ready!',
    'trailing\\',
    'quoted"and-trailing\\',
    'amp&ersand',
    '-Poperators=one|two<three>four^five',
  ], '.gradlew-lf-test', 'C:\\Windows\\System32\\cmd.exe');

  assert.deepEqual(invocation, {
    command: 'C:\\Windows\\System32\\cmd.exe',
    args: [
      '/d',
      '/s',
      '/v:off',
      '/c',
      '"gradlew.bat ^^^"^^^" ^^^"assemble^^^ Debug^^^" ^^^"-Pmessage=50^^^%^^^ ^^^&^^^ ready^^^!^^^" ^^^"trailing\\\\^^^" ^^^"quoted\\^^^"and-trailing\\\\^^^" ^^^"amp^^^&ersand^^^" ^^^"-Poperators=one^^^|two^^^<three^^^>four^^^^five^^^""',
    ],
    windowsVerbatimArguments: true,
  });
});

const roundTripArguments = [
  '',
  'trailing\\',
  'quoted"and-trailing\\',
  'amp&ersand',
  'percent%value',
  'bang!value',
  'pipe|value',
  'less<value',
  'greater>value',
  'caret^value',
];

test('round-trips arguments through cmd.exe and gradlew.bat', (context) => {
  if (process.platform !== 'win32') {
    context.skip('requires Windows Node.js so cmd.exe receives windowsVerbatimArguments');
    return;
  }

  const directory = mkdtempSync(join(tmpdir(), 'run-android-gradle-'));

  try {
    writeFileSync(join(directory, 'capture.mjs'), [
      "import { writeFileSync } from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      "writeFileSync(fileURLToPath(new URL('argv.json', import.meta.url)), JSON.stringify(process.argv.slice(2)));",
    ].join('\n'));
    writeFileSync(join(directory, 'gradlew.bat'), '@echo off\r\nnode "%~dp0capture.mjs" %*\r\nexit /b %errorlevel%\r\n');

    const invocation = createGradleInvocation('win32', roundTripArguments, '.gradlew-lf-test');
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: directory,
      encoding: 'utf8',
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'argv.json'), 'utf8')), roundTripArguments);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runs the Windows round-trip from WSL when Windows Node.js is available', (context) => {
  if (process.platform === 'win32') {
    context.skip('Windows round-trip runs directly');
    return;
  }

  const whereNode = spawnSync('cmd.exe', ['/d', '/s', '/c', 'where node'], { encoding: 'utf8' });
  const windowsNode = whereNode.status === 0 ? whereNode.stdout.trim().split(/\r?\n/, 1)[0] : '';
  const windowsTestFile = spawnSync('wslpath', ['-w', fileURLToPath(import.meta.url)], { encoding: 'utf8' });

  if (!windowsNode || windowsTestFile.status !== 0) {
    context.skip('cmd.exe with Windows Node.js is unavailable');
    return;
  }

  const result = spawnSync('cmd.exe', ['/d', '/s', '/v:off', '/c', 'node', '--test', windowsTestFile.stdout.trim()], {
    encoding: 'utf8',
  });

  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
