import { createUpdateProgress, normalizeUpdateEvent } from '../updateLogic.js';
import { isTauriRuntime } from './runtime.js';

function usesDesktopRuntime(options) {
  return options.desktop ?? isTauriRuntime(options.windowLike);
}

async function loadAppModule() {
  return import('@tauri-apps/api/app');
}

async function loadUpdaterModule() {
  return import('@tauri-apps/plugin-updater');
}

async function loadProcessModule() {
  return import('@tauri-apps/plugin-process');
}

export async function getDesktopVersion(options = {}) {
  if (!usesDesktopRuntime(options)) return '';
  const appModule = await (options.loadAppModule || loadAppModule)();
  return appModule.getVersion();
}

export async function checkForDesktopUpdate(options = {}) {
  if (!usesDesktopRuntime(options)) return null;
  const updaterModule = await (options.loadUpdaterModule || loadUpdaterModule)();
  return updaterModule.check();
}

export async function installDesktopUpdate(update, onProgress = () => {}, options = {}) {
  if (!usesDesktopRuntime(options)) {
    throw new Error('当前网页版本不支持客户端更新');
  }
  if (!update?.downloadAndInstall) {
    throw new Error('没有可安装的客户端更新');
  }

  let progress = createUpdateProgress();
  await update.downloadAndInstall((event) => {
    progress = normalizeUpdateEvent(event, progress);
    onProgress(progress);
  });
}

export async function relaunchDesktopApp(options = {}) {
  if (!usesDesktopRuntime(options)) return false;
  const processModule = await (options.loadProcessModule || loadProcessModule)();
  await processModule.relaunch();
  return true;
}
