<script lang="ts">
	import '../app.css';
	import BottomDock from '$lib/components/BottomDock.svelte';
	import AddItemSheet from '$lib/components/AddItemSheet.svelte';
	import AddBudgetSheet from '$lib/components/AddBudgetSheet.svelte';
	import AddPurchaseSheet from '$lib/components/AddPurchaseSheet.svelte';
	import AddShoppingItemSheet from '$lib/components/AddShoppingItemSheet.svelte';
	import InventoryPickerSheet from '$lib/components/InventoryPickerSheet.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import LanguageWelcome from '$lib/components/LanguageWelcome.svelte';
	import { initDb } from '$lib/db/client';
	import { initializeDatabase } from '$lib/db/queries';
	import { startSync } from '$lib/db/sync';
	import { checkSession, getAuthState } from '$lib/stores/auth.svelte';
	import { getModalState } from '$lib/stores/modal.svelte';
	import { onMount } from 'svelte';
	import { t, initLocale } from '$lib/i18n/index.svelte';

	let { children } = $props();

	let auth = getAuthState();
	let modal = getModalState();
	let dbReady = $state(false);
	let dbError = $state('');
	let languageChosen = $state(false);

	onMount(async () => {
		languageChosen = initLocale();

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

{#if !languageChosen}
	<LanguageWelcome onSelect={() => languageChosen = true} />
{:else if dbReady}
	{#if auth.isAuthenticated}
		{@render children()}
		<BottomDock />

		<!-- Context-sensitive sheets -->
		{#if modal.current === 'add-item'}
			<AddItemSheet />
		{:else if modal.current === 'add-budget'}
			<AddBudgetSheet />
		{:else if modal.current === 'add-purchase'}
			<AddPurchaseSheet />
		{:else if modal.current === 'add-shopping-item'}
			<AddShoppingItemSheet />
		{:else if modal.current === 'inventory-picker-pan'}
			<InventoryPickerSheet mode="pan-project" />
		{:else if modal.current === 'inventory-picker-declutter'}
			<InventoryPickerSheet mode="declutter" />
		{/if}
	{:else if !auth.isLoading}
		<main style="padding: 60px 24px;">
			<LoginForm />
		</main>
	{:else}
		<div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
			<p>{t.common.loading}</p>
		</div>
	{/if}
{:else if dbError}
	<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 24px; text-align: center;">
		<p style="color: var(--accent-pink); font-weight: 600; margin-bottom: 8px;">{t.layout.failedToConnect}</p>
		<p style="font-size: 12px; color: var(--text-soft); word-break: break-all;">{dbError}</p>
	</div>
{:else}
	<div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
		<p>{t.common.loading}</p>
	</div>
{/if}
