import { isTauriRuntime } from './runtime.js';

async function loadDesktopFileModules() {
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  return { save, writeFile };
}

async function loadDesktopOpener() {
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  return { openUrl };
}

function desktopRuntime(options) {
  return options.desktop ?? isTauriRuntime(options.windowLike);
}

function browserWindow(options) {
  return options.windowLike ?? window;
}

export async function saveBytes({ suggestedName, bytes, filters = [] }, options = {}) {
  if (desktopRuntime(options)) {
    const loadModules = options.loadDesktopModules ?? loadDesktopFileModules;
    const { save, writeFile } = await loadModules();
    const path = await save({ defaultPath: suggestedName, filters });
    if (!path) return { saved: false };
    await writeFile(path, bytes);
    return { saved: true, path };
  }

  const documentLike = options.documentLike ?? document;
  const urlLike = options.urlLike ?? URL;
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = urlLike.createObjectURL(blob);
  const link = documentLike.createElement('a');
  link.href = url;
  link.download = suggestedName;
  documentLike.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    urlLike.revokeObjectURL(url);
  }
  return { saved: true };
}

export async function openExternal(url, options = {}) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('外部链接必须是有效的 HTTPS 地址');
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('外部链接仅支持 HTTPS 地址');
  }

  if (desktopRuntime(options)) {
    const loadOpener = options.loadDesktopOpener ?? loadDesktopOpener;
    const { openUrl } = await loadOpener();
    await openUrl(parsedUrl.toString());
    return;
  }

  browserWindow(options).open(parsedUrl.toString(), '_blank', 'noopener,noreferrer');
}

function waitForDocumentRender(windowLike) {
  return new Promise((resolve) => {
    const schedule = windowLike.requestAnimationFrame
      ? windowLike.requestAnimationFrame.bind(windowLike)
      : (callback) => windowLike.setTimeout(callback, 0);
    schedule(() => schedule(resolve));
  });
}

export async function printCurrentDocument(options = {}) {
  const windowLike = browserWindow(options);
  const waitForRender = options.waitForRender ?? (() => waitForDocumentRender(windowLike));
  await waitForRender();
  windowLike.print();
}
