import { invoke } from '@tauri-apps/api/core';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let online = navigator.onLine;

export function startSync(intervalMs = 30_000) {
	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);

	if (navigator.onLine) {
		triggerSync();
	}

	syncInterval = setInterval(() => {
		if (navigator.onLine) triggerSync();
	}, intervalMs);
}

export function stopSync() {
	if (syncInterval) clearInterval(syncInterval);
	window.removeEventListener('online', onOnline);
	window.removeEventListener('offline', onOffline);
}

async function onOnline() {
	online = true;
	await triggerSync();
}

function onOffline() {
	online = false;
}

export async function triggerSync(): Promise<void> {
	try {
		const frames = await invoke<number>('db_sync');
		console.log(`Synced ${frames} frames`);
	} catch (e) {
		console.warn('Sync failed (will retry):', e);
	}
}

export function getIsOnline() {
	return online;
}
