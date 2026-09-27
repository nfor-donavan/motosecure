import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const SNAPSHOT_KEY = "motosecure-offline-snapshot";
const QUEUE_KEY = "motosecure-offline-queue";

/**
 * Downloads the latest rider snapshot from the API and caches it
 * locally. Call this whenever the app is confirmed online (e.g. right
 * after a successful login, or on Home screen focus) so the cache
 * stays reasonably fresh. Fails silently - if this can't reach the
 * server, we just keep whatever snapshot is already cached.
 */
export async function refreshSnapshot() {
  try {
    const { data } = await api.get("/riders/offline-snapshot");
    await AsyncStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ generatedAt: data.generatedAt, snapshot: data.snapshot })
    );
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

/**
 * Looks up a badge ID in the locally cached snapshot. Returns null if
 * there's no cache yet, or no matching rider in it.
 */
export async function lookupInSnapshot(badgeId) {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;
  const { snapshot } = JSON.parse(raw);
  return snapshot.find((r) => r.badgeId === badgeId) || null;
}

/**
 * Derives the same "valid / expired / suspended / flagged" verdict the
 * server would, from a cached snapshot entry - so an offline scan shows
 * a real verdict, not just "we don't know."
 */
export function resolveOfflineResult(cachedRider) {
  if (!cachedRider) return "not_found";
  if (cachedRider.status === "suspended") return "suspended";
  if (cachedRider.status === "revoked" || cachedRider.status === "under_review") return "flagged";
  if (cachedRider.licenseExpiresAt && new Date(cachedRider.licenseExpiresAt) < new Date()) return "expired";
  return "valid";
}

/**
 * Queues a scan that happened while offline, to be synced to the real
 * server the next time the app is online.
 */
export async function queueOfflineScan(entry) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...entry, scannedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueueCount() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).length : 0;
}

/**
 * Sends every queued offline scan to the server in one batch, then
 * clears the queue on success. Safe to call opportunistically (e.g. on
 * Home screen focus) - if it fails, the queue is simply left intact to
 * try again next time.
 */
export async function flushOfflineQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  if (queue.length === 0) return { synced: 0, skipped: 0 };

  try {
    const { data } = await api.post("/enforcement/sync-scans", { scans: queue });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    return { synced: data.synced, skipped: data.skipped };
  } catch {
    // Stay queued, try again next opportunity.
    return null;
  }
}
