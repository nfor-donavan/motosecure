import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const SNAPSHOT_KEY = "motosecure-offline-snapshot";
const QUEUE_KEY = "motosecure-offline-queue";
const RECENT_KEY = "motosecure-recent-scans";
const MAX_QUEUE = 500;

/** True when a failed request means "no usable connection" rather than a server verdict. */
export function isNetworkFailure(err) {
  if (!err) return false;
  if (!err.response) return true; // no response at all: offline, DNS failure, timeout
  return [502, 503, 504].includes(err.response.status); // server asleep / restarting
}

/**
 * Downloads the latest rider snapshot and caches it locally. Silent on
 * failure: the previous snapshot is simply kept.
 */
export async function refreshSnapshot() {
  try {
    const { data } = await api.get("/riders/offline-snapshot");
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ generatedAt: data.generatedAt, snapshot: data.snapshot }));
    return true;
  } catch {
    return false;
  }
}

export async function getSnapshotMeta() {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return { generatedAt: null, count: 0 };
  const parsed = JSON.parse(raw);
  return { generatedAt: parsed.generatedAt, count: parsed.snapshot?.length || 0 };
}

/** Looks a badge up in the cached snapshot (null if no cache or no match). */
export async function lookupInSnapshot(badgeId) {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;
  const { snapshot } = JSON.parse(raw);
  const wanted = String(badgeId || "").trim().toUpperCase();
  return snapshot.find((r) => r.badgeId === wanted) || null;
}

/**
 * Same verdict rules as the server (backend/lib/verdict.js); a unit test
 * executes this exact function against the server's to keep them aligned.
 */
export function resolveOfflineResult(cachedRider) {
  if (!cachedRider) return "not_found";
  if (cachedRider.status === "suspended") return "suspended";
  if (cachedRider.status === "revoked" || cachedRider.status === "under_review") return "flagged";
  if (cachedRider.licenseExpiresAt && new Date(cachedRider.licenseExpiresAt) < new Date()) return "expired";
  return "valid";
}

const newScanId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Queues a scan made offline; each carries a unique id so syncing is idempotent. */
export async function queueOfflineScan(entry) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...entry, scanId: newScanId(), scannedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
}

export async function getQueueCount() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).length : 0;
}

/** Sends queued scans in batches the server accepts; keeps unsent batches if offline. */
export async function flushOfflineQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  let queue = raw ? JSON.parse(raw) : [];
  if (queue.length === 0) return { synced: 0, duplicates: 0, rejected: 0 };
  const total = { synced: 0, duplicates: 0, rejected: 0 };
  try {
    while (queue.length > 0) {
      const batch = queue.slice(0, 200);
      const { data } = await api.post("/enforcement/sync-scans", { scans: batch });
      total.synced += data.synced; total.duplicates += data.duplicates; total.rejected += data.rejected;
      queue = queue.slice(batch.length);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
    return total;
  } catch {
    return null; // remaining scans stay queued for the next attempt
  }
}

/** Removes every piece of locally cached rider data; called on sign-out. */
export async function clearOfflineData() {
  await AsyncStorage.multiRemove([SNAPSHOT_KEY, QUEUE_KEY, RECENT_KEY]);
}
