<script lang="ts">
	import { onMount } from 'svelte';
	import { getItems, addPanItem, logDeclutter, type Item } from '$lib/db/queries';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { closeModal } from '$lib/stores/modal.svelte';
	import { triggerRefresh } from '$lib/stores/refresh.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { mode, onPicked }: {
		mode: 'pan-project' | 'declutter';
		onPicked?: () => void;
	} = $props();

	let auth = getAuthState();

	let items = $state<Item[]>([]);
	let search = $state('');
	let loading = $state(true);
	let processing = $state(false);

	// Pan project state
	let selectedItem = $state<Item | null>(null);
	let quantity = $state(1);

	// Declutter state
	let declutterItem = $state<Item | null>(null);
	let declutterMethod = $state('');
	let declutterReason = $state('');
	let declutterAmount = $state('');

	let filteredItems = $derived(
		search.trim()
			? items.filter(item =>
				item.name.toLowerCase().includes(search.trim().toLowerCase())
			)
			: items
	);

	onMount(async () => {
		const userId = auth.currentUser?.id;
		if (!userId) return;
		try {
			items = await getItems(userId, undefined, undefined, 'active');
		} catch (e) {
			console.error('Failed to load items:', e);
		} finally {
			loading = false;
		}
	});

	function handleBackdropClick() {
		closeModal();
	}

	function handleSheetClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function handleItemTap(item: Item) {
		if (mode === 'pan-project') {
			selectedItem = item;
			quantity = 1;
		} else {
			declutterItem = item;
			declutterMethod = '';
			declutterReason = '';
			declutterAmount = '';
		}
	}

	function handleSelectMethod(method: string) {
		declutterMethod = method;
	}

	function cancelSelection() {
		selectedItem = null;
		declutterItem = null;
		declutterMethod = '';
	}

	async function confirmPanProject() {
		if (!selectedItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		processing = true;
		try {
			await addPanItem(userId, selectedItem.id, quantity);
			closeModal();
			triggerRefresh();
			onPicked?.();
		} catch (e) {
			console.error('Failed to add pan item:', e);
		} finally {
			processing = false;
		}
	}

	async function confirmDeclutter() {
		if (!declutterItem || !declutterMethod) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		processing = true;
		try {
			await logDeclutter(
				userId,
				declutterItem.id,
				declutterMethod,
				declutterReason || undefined,
				declutterMethod === 'sold' ? Number(declutterAmount) || 0 : 0
			);
			closeModal();
			triggerRefresh();
			onPicked?.();
		} catch (e) {
			console.error('Failed to declutter item:', e);
		} finally {
			processing = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="picker-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="picker-sheet" onclick={handleSheetClick}>
		<div class="sheet-handle"></div>

		<!-- Header -->
		<div class="sheet-header">
			<h2 class="sheet-title">{t.inventoryPicker.selectItem}</h2>
			<button class="close-btn" onclick={() => closeModal()} aria-label="Close picker">
				<i class="ri-close-line"></i>
			</button>
		</div>

		<!-- Search -->
		<div class="search-wrapper">
			<i class="ri-search-line search-icon"></i>
			<input
				class="search-input"
				type="text"
				placeholder={t.inventoryPicker.searchItems}
				bind:value={search}
			/>
			{#if search}
				<button class="search-clear" onclick={() => search = ''} aria-label="Clear search">
					<i class="ri-close-circle-fill"></i>
				</button>
			{/if}
		</div>

		<!-- Item List -->
		<div class="item-list">
			{#if loading}
				{#each Array(5) as _, i (i)}
					<div class="skeleton-row shimmer"></div>
				{/each}
			{:else if filteredItems.length === 0}
				<div class="empty-state">
					<i class="ri-inbox-line empty-icon"></i>
					<p class="empty-text">{t.inventoryPicker.noActiveItems}</p>
				</div>
			{:else}
				{#each filteredItems as item (item.id)}
					<button
						class="item-row"
						class:selected={selectedItem?.id === item.id || declutterItem?.id === item.id}
						onclick={() => handleItemTap(item)}
					>
						<i class="{item.category_icon} item-icon"></i>
						<div class="item-info">
							<span class="item-name">{item.name}</span>
							<span class="item-category">{item.subcategory_name ?? item.category_name}</span>
						</div>
						<i class="ri-arrow-right-s-line item-chevron"></i>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Pan Project Confirmation -->
		{#if mode === 'pan-project' && selectedItem}
			<div class="confirm-panel">
				<div class="confirm-item-header">
					<i class="{selectedItem.category_icon} confirm-icon"></i>
					<span class="confirm-name">{selectedItem.name}</span>
				</div>

				<div class="quantity-row">
					<label class="quantity-label" for="pan-quantity">{t.panProject.quantity}</label>
					<div class="quantity-control">
						<button
							class="qty-btn"
							onclick={() => { if (quantity > 1) quantity--; }}
							disabled={quantity <= 1}
							aria-label="Decrease quantity"
						>
							<i class="ri-subtract-line"></i>
						</button>
						<input
							id="pan-quantity"
							class="qty-input"
							type="number"
							min="1"
							bind:value={quantity}
						/>
						<button
							class="qty-btn"
							onclick={() => quantity++}
							aria-label="Increase quantity"
						>
							<i class="ri-add-line"></i>
						</button>
					</div>
				</div>

				<div class="confirm-actions">
					<button class="btn-cancel" onclick={cancelSelection} disabled={processing}>
						{t.common.cancel}
					</button>
					<button class="btn-confirm" onclick={confirmPanProject} disabled={processing}>
						{#if processing}
							<i class="ri-loader-4-line spin"></i>
						{/if}
						{t.panProject.addItems}
					</button>
				</div>
			</div>
		{/if}

		<!-- Declutter Confirmation -->
		{#if mode === 'declutter' && declutterItem}
			<div class="confirm-panel">
				<div class="confirm-item-header">
					<i class="{declutterItem.category_icon} confirm-icon"></i>
					<span class="confirm-name">{declutterItem.name}</span>
				</div>

				{#if !declutterMethod}
					<!-- Method selection buttons -->
					<div class="method-grid">
						<button class="method-btn donate" onclick={() => handleSelectMethod('donated')}>
							<i class="ri-heart-line"></i>
							<span>{t.declutter.donate}</span>
						</button>
						<button class="method-btn sell" onclick={() => handleSelectMethod('sold')}>
							<i class="ri-money-dollar-circle-line"></i>
							<span>{t.declutter.sell}</span>
						</button>
						<button class="method-btn gift" onclick={() => handleSelectMethod('gifted')}>
							<i class="ri-gift-line"></i>
							<span>{t.declutter.gift}</span>
						</button>
						<button class="method-btn trash" onclick={() => handleSelectMethod('trashed')}>
							<i class="ri-delete-bin-line"></i>
							<span>{t.declutter.trash}</span>
						</button>
					</div>
					<button class="btn-back" onclick={cancelSelection}>
						{t.common.cancel}
					</button>
				{:else}
					<!-- Reason + amount for selected method -->
					<div class="selected-method-badge">
						{#if declutterMethod === 'donated'}
							<i class="ri-heart-line"></i> {t.declutter.donate}
						{:else if declutterMethod === 'sold'}
							<i class="ri-money-dollar-circle-line"></i> {t.declutter.sell}
						{:else if declutterMethod === 'gifted'}
							<i class="ri-gift-line"></i> {t.declutter.gift}
						{:else}
							<i class="ri-delete-bin-line"></i> {t.declutter.trash}
						{/if}
					</div>

					<textarea
						class="reason-input"
						placeholder={t.declutter.reasonPlaceholder}
						bind:value={declutterReason}
						rows="2"
					></textarea>

					{#if declutterMethod === 'sold'}
						<div class="amount-input-wrapper">
							<span class="amount-prefix">&euro;</span>
							<input
								type="number"
								class="amount-input"
								placeholder={t.declutter.amountRecovered}
								bind:value={declutterAmount}
								min="0"
								step="0.01"
							/>
						</div>
					{/if}

					<div class="confirm-actions">
						<button class="btn-cancel" onclick={() => declutterMethod = ''} disabled={processing}>
							{t.common.cancel}
						</button>
						<button class="btn-confirm" onclick={confirmDeclutter} disabled={processing}>
							{#if processing}
								<i class="ri-loader-4-line spin"></i> {t.declutter.processing}
							{:else}
								{t.common.confirm}
							{/if}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Backdrop */
	.picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Sheet */
	.picker-sheet {
		width: 100%;
		max-width: 500px;
		max-height: 85vh;
		background: #fdfbf7;
		border-radius: var(--radius-l) var(--radius-l) 0 0;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.sheet-handle {
		width: 40px;
		height: 4px;
		background: rgba(0, 0, 0, 0.12);
		border-radius: 2px;
		margin: 12px auto 0;
		flex-shrink: 0;
	}

	/* Header */
	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 0;
	}

	.sheet-title {
		font-family: 'Poppins', sans-serif;
		font-size: 20px;
		font-weight: 700;
		color: var(--text-dark);
		margin: 0;
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 20px;
		color: var(--text-soft);
		flex-shrink: 0;
		transition: background 0.2s ease;
	}

	.close-btn:active {
		background: rgba(0, 0, 0, 0.04);
		transform: scale(0.95);
	}

	/* Search */
	.search-wrapper {
		position: relative;
		margin: 16px 20px 0;
		flex-shrink: 0;
	}

	.search-icon {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 18px;
		color: var(--text-soft);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 12px 40px 12px 42px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 50px;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		background: rgba(255, 255, 255, 0.8);
		color: var(--text-dark);
		outline: none;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: var(--accent-pink);
	}

	.search-input::placeholder {
		color: var(--text-soft);
	}

	.search-clear {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		font-size: 18px;
		color: var(--text-soft);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Item List */
	.item-list {
		flex: 1;
		overflow-y: auto;
		padding: 12px 20px calc(16px + env(safe-area-inset-bottom, 0px));
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.item-list::-webkit-scrollbar {
		display: none;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 14px;
		border-radius: var(--radius-m, 12px);
		border: 1px solid rgba(0, 0, 0, 0.04);
		background: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
		margin-bottom: 6px;
		text-align: left;
		font-family: 'Poppins', sans-serif;
	}

	.item-row:active {
		transform: scale(0.98);
		background: rgba(233, 30, 99, 0.04);
	}

	.item-row.selected {
		border-color: var(--accent-pink);
		background: rgba(233, 30, 99, 0.06);
	}

	.item-icon {
		font-size: 20px;
		color: var(--accent-pink);
		width: 38px;
		height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(233, 30, 99, 0.08);
		flex-shrink: 0;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-dark);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-category {
		font-size: 12px;
		color: var(--text-soft);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-chevron {
		font-size: 18px;
		color: var(--text-soft);
		flex-shrink: 0;
		opacity: 0.5;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 32px 0;
		gap: 12px;
	}

	.empty-icon {
		font-size: 40px;
		color: var(--text-soft);
		opacity: 0.4;
	}

	.empty-text {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-soft);
		text-align: center;
		margin: 0;
		font-family: 'Poppins', sans-serif;
	}

	/* Skeleton */
	.skeleton-row {
		height: 58px;
		border-radius: var(--radius-m, 12px);
		margin-bottom: 6px;
	}

	.shimmer {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Confirm Panel */
	.confirm-panel {
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		padding: 16px 20px calc(32px + env(safe-area-inset-bottom, 0px));
		flex-shrink: 0;
		background: #fdfbf7;
	}

	.confirm-item-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.confirm-icon {
		font-size: 22px;
		color: var(--accent-pink);
		width: 42px;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(233, 30, 99, 0.08);
		flex-shrink: 0;
	}

	.confirm-name {
		font-family: 'Poppins', sans-serif;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dark);
	}

	/* Quantity Row (Pan Project) */
	.quantity-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.quantity-label {
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-dark);
	}

	.quantity-control {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.qty-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.08);
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		color: var(--text-dark);
		cursor: pointer;
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.qty-btn:active {
		transform: scale(0.9);
		background: rgba(0, 0, 0, 0.04);
	}

	.qty-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.qty-input {
		width: 52px;
		text-align: center;
		padding: 8px 4px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: var(--radius-s, 8px);
		font-family: 'Poppins', sans-serif;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dark);
		background: rgba(255, 255, 255, 0.8);
		outline: none;
		-moz-appearance: textfield;
	}

	.qty-input::-webkit-outer-spin-button,
	.qty-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Method Grid (Declutter) */
	.method-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 12px;
	}

	.method-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 16px 12px;
		border-radius: var(--radius-m, 12px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		cursor: pointer;
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 600;
		transition: transform 0.15s ease, box-shadow 0.2s ease;
	}

	.method-btn:active {
		transform: scale(0.95);
	}

	.method-btn i {
		font-size: 22px;
	}

	.method-btn.donate {
		background: #FCE4EC;
		color: #E91E63;
	}

	.method-btn.sell {
		background: #E8F5E9;
		color: #4CAF50;
	}

	.method-btn.gift {
		background: #FFF3E0;
		color: #FF9800;
	}

	.method-btn.trash {
		background: #F5F5F5;
		color: #9E9E9E;
	}

	.btn-back {
		width: 100%;
		padding: 12px;
		border-radius: var(--radius-s, 8px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: transparent;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-soft);
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.btn-back:active {
		transform: scale(0.97);
	}

	/* Selected Method Badge */
	.selected-method-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 50px;
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent-pink);
		background: rgba(233, 30, 99, 0.08);
		margin-bottom: 12px;
	}

	/* Reason Input */
	.reason-input {
		width: 100%;
		padding: 12px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: var(--radius-s, 8px);
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		color: var(--text-dark);
		background: rgba(255, 255, 255, 0.5);
		resize: none;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
		margin-bottom: 10px;
	}

	.reason-input:focus {
		border-color: var(--accent-pink);
	}

	/* Amount Input */
	.amount-input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: var(--radius-s, 8px);
		background: rgba(255, 255, 255, 0.5);
		transition: border-color 0.2s;
		margin-bottom: 10px;
	}

	.amount-input-wrapper:focus-within {
		border-color: #4CAF50;
	}

	.amount-prefix {
		font-size: 15px;
		font-weight: 700;
		color: #4CAF50;
	}

	.amount-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-dark);
	}

	.amount-input::placeholder {
		color: var(--text-soft);
		font-weight: 400;
	}

	/* Confirm Actions */
	.confirm-actions {
		display: flex;
		gap: 10px;
		margin-top: 4px;
	}

	.btn-cancel {
		flex: 1;
		padding: 14px;
		border-radius: 50px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: transparent;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-soft);
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.btn-cancel:active {
		transform: scale(0.97);
	}

	.btn-confirm {
		flex: 1;
		padding: 14px;
		border-radius: 50px;
		border: none;
		background: var(--primary-gradient);
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		cursor: pointer;
		transition: transform 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.btn-confirm:active {
		transform: scale(0.97);
	}

	.btn-confirm:disabled,
	.btn-cancel:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Spinner */
	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
