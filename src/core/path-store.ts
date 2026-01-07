
export const PathStore = new Map<number, Array<{x: number, y: number}>>();

export function setPath(eid: number, path: Array<{x: number, y: number}>) {
  PathStore.set(eid, path);
}

export function getPath(eid: number) {
  return PathStore.get(eid);
}

export function clearPath(eid: number) {
  PathStore.delete(eid);
}
