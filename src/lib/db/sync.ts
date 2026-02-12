import { invoke } from '@tauri-apps/api/core';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let pendingSync = false;

export function startSync(intervalMs = 5_000) {
	document.addEventListener('visibilitychange', onVisibilityChange);

	triggerSync();

	syncInterval = setInterval(() => {
		triggerSync();
	}, intervalMs);
}

export function stopSync() {
	if (syncInterval) clearInterval(syncInterval);
	if (debounceTimer) clearTimeout(debounceTimer);
	document.removeEventListener('visibilitychange', onVisibilityChange);
}

function onVisibilityChange() {
	triggerSync();
}

export async function triggerSync(): Promise<void> {
	if (syncing) {
		pendingSync = true;
		return;
	}
	syncing = true;
	try {
		const frames = await invoke<number>('db_sync');
		if (frames > 0) console.log(`Synced ${frames} frames`);
	} catch (e) {
		console.warn('Sync failed:', e);
	} finally {
		syncing = false;
		if (pendingSync) {
			pendingSync = false;
			triggerSync();
		}
	}
}

/** Call after any write operation — debounces 300ms so batch writes don't hammer the server */
export function syncAfterWrite(): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		triggerSync();
	}, 300);
}
