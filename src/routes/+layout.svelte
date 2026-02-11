<script>
	import '../app.css';
	import BottomDock from '$lib/components/BottomDock.svelte';
	import AddModal from '$lib/components/AddModal.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import { initDb } from '$lib/db/client';
	import { initializeDatabase } from '$lib/db/queries';
	import { startSync } from '$lib/db/sync';
	import { checkSession, getAuthState } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	let auth = getAuthState();
	let dbReady = $state(false);
	let dbError = $state('');

	onMount(async () => {
		try {
			await initDb();
			await initializeDatabase();
			dbReady = true;
			startSync();
			try {
				await checkSession();
			} catch {
				// Auth check is optional
			}
		} catch (error) {
			console.error('Failed to initialize:', error);
			dbError = String(error);
		}
	});
</script>

{#if dbReady}
	{#if auth.isAuthenticated}
		{@render children()}
		<BottomDock />
		<AddModal />
	{:else if !auth.isLoading}
		<main style="padding: 60px 24px;">
			<LoginForm />
		</main>
	{:else}
		<div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
			<p>Loading...</p>
		</div>
	{/if}
{:else if dbError}
	<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 24px; text-align: center;">
		<p style="color: var(--accent-pink); font-weight: 600; margin-bottom: 8px;">Failed to connect</p>
		<p style="font-size: 12px; color: var(--text-soft); word-break: break-all;">{dbError}</p>
	</div>
{:else}
	<div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
		<p>Loading...</p>
	</div>
{/if}
