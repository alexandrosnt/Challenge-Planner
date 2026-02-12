import { invoke } from '@tauri-apps/api/core';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let online = navigator.onLine;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

export function startSync(intervalMs = 5_000) {
	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);
	document.addEventListener('visibilitychange', onVisibilityChange);

	if (navigator.onLine) {
		triggerSync();
	}

	syncInterval = setInterval(() => {
		if (navigator.onLine) triggerSync();
	}, intervalMs);
}

export function stopSync() {
	if (syncInterval) clearInterval(syncInterval);
	if (debounceTimer) clearTimeout(debounceTimer);
	window.removeEventListener('online', onOnline);
	window.removeEventListener('offline', onOffline);
	document.removeEventListener('visibilitychange', onVisibilityChange);
}

async function onOnline() {
	online = true;
	await triggerSync();
}

function onOffline() {
	online = false;
}

function onVisibilityChange() {
	if (navigator.onLine) triggerSync();
}

export async function triggerSync(): Promise<void> {
	if (syncing) return;
	syncing = true;
	try {
		const frames = await invoke<number>('db_sync');
		if (frames > 0) console.log(`Synced ${frames} frames`);
	} catch (e) {
		console.warn('Sync failed (will retry):', e);
	} finally {
		syncing = false;
	}
}

/** Call after any write operation — debounces 300ms so batch writes don't hammer the server */
export function syncAfterWrite(): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		if (navigator.onLine) triggerSync();
	}, 300);
}

export function getIsOnline() {
	return online;
}
