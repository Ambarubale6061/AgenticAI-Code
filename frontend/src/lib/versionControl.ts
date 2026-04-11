// Lightweight version control — save/restore code snapshots

import type { CodeFile } from "@/components/workspace/CodePanel";

export interface CodeSnapshot {
  id: string;
  label: string;
  timestamp: number;
  files: CodeFile[];
}

const SNAPSHOTS_KEY = "codeagent_snapshots";
const MAX_SNAPSHOTS = 20;

function getStorageKey(projectId: string): string {
  return `${SNAPSHOTS_KEY}_${projectId}`;
}

export function loadSnapshots(projectId: string): CodeSnapshot[] {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshots(projectId: string, snapshots: CodeSnapshot[]) {
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(snapshots.slice(-MAX_SNAPSHOTS)));
}

export function createSnapshot(projectId: string, files: CodeFile[], label?: string): CodeSnapshot {
  const snapshots = loadSnapshots(projectId);
  const version = snapshots.length + 1;
  const snapshot: CodeSnapshot = {
    id: Date.now().toString(),
    label: label || `v${version}`,
    timestamp: Date.now(),
    files: files.map(f => ({ ...f })),
  };
  snapshots.push(snapshot);
  saveSnapshots(projectId, snapshots);
  return snapshot;
}

export function deleteSnapshot(projectId: string, snapshotId: string) {
  const snapshots = loadSnapshots(projectId).filter(s => s.id !== snapshotId);
  saveSnapshots(projectId, snapshots);
}

export function formatSnapshotTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
