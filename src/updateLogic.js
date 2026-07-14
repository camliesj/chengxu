export function createUpdateProgress() {
  return { downloaded: 0, total: 0, complete: false };
}

export function normalizeUpdateEvent(event, currentProgress = createUpdateProgress()) {
  const current = {
    downloaded: Number(currentProgress.downloaded) || 0,
    total: Number(currentProgress.total) || 0,
    complete: Boolean(currentProgress.complete),
  };

  if (event?.event === 'Started') {
    return {
      downloaded: 0,
      total: Number(event.data?.contentLength) || 0,
      complete: false,
    };
  }

  if (event?.event === 'Progress') {
    return {
      ...current,
      downloaded: current.downloaded + (Number(event.data?.chunkLength) || 0),
      complete: false,
    };
  }

  if (event?.event === 'Finished') {
    return { ...current, complete: true };
  }

  return current;
}
