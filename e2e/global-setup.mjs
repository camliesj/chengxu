import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const serverUrl = 'http://127.0.0.1:4174';

export default async function globalSetup() {
  if (await isReady()) return undefined;

  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '4174'], {
    cwd,
    stdio: 'ignore',
    windowsHide: true,
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isReady()) {
      return async () => stopServer(server);
    }
    if (server.exitCode !== null) throw new Error(`Vite 测试服务启动失败，退出码：${server.exitCode}`);
    await delay(200);
  }

  await stopServer(server);
  throw new Error('Vite 测试服务在 30 秒内未就绪');
}

async function isReady() {
  try {
    const response = await fetch(serverUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(3_000).then(() => {
      if (server.exitCode === null) server.kill('SIGKILL');
    }),
  ]);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
