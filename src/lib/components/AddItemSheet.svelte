<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { closeModal } from '$lib/stores/modal.svelte';
	import { triggerRefresh } from '$lib/stores/refresh.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import {
		getCategories,
		getSubcategories,
		addItem,
		type Category,
		type Subcategory
	} from '$lib/db/queries';

	let { onAdded }: { onAdded?: () => void } = $props();

	let auth = getAuthState();

	let categories: Category[] = $state([]);
	let subcategories: Subcategory[] = $state([]);
	let submitting = $state(false);

	// Form fields
	let name = $state('');
	let categoryId = $state(0);
	let subcategoryId = $state(0);
	let purchasePrice = $state('');
	let quantity = $state(1);
	let purchaseDate = $state('');
	let notes = $state('');

	// Load subcategories reactively when category changes.
	// This must use $effect because getSubcategories is an async DB call
	// that cannot be expressed with $derived. This matches the existing
	// pattern used in AddModal.svelte.
	$effect(() => {
		const catId = categoryId;
		if (catId > 0) {
			getSubcategories(catId).then((result) => {
				subcategories = result;
				// Reset subcategory selection when parent category changes
				subcategoryId = 0;
			});
		} else {
			subcategories = [];
			subcategoryId = 0;
		}
	});

	onMount(async () => {
		categories = await getCategories();
	});

	function resetForm() {
		name = '';
		categoryId = 0;
		subcategoryId = 0;
		purchasePrice = '';
		quantity = 1;
		purchaseDate = '';
		notes = '';
		subcategories = [];
	}

	function handleBackdropClick() {
		closeModal();
		resetForm();
	}

	function handleSheetClick(e: MouseEvent) {
		e.stopPropagation();
	}

	async function handleSubmit() {
		if (!name || !categoryId) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addItem(
				userId,
				name,
				categoryId,
				subcategoryId || null,
				purchasePrice ? Number(purchasePrice) : null,
				purchaseDate || null,
				quantity,
				notes || null
			);
			closeModal();
			resetForm();
			triggerRefresh();
			onAdded?.();
		} finally {
			submitting = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-sheet" onclick={handleSheetClick}>
		<div class="sheet-handle"></div>

		<div class="sheet-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="item-name">{t.common.name}</label>
					<input
						id="item-name"
						type="text"
						bind:value={name}
						placeholder={t.addModal.productName}
						required
					/>
				</div>

				<div class="form-group">
					<label for="item-category">{t.common.category}</label>
					<select id="item-category" bind:value={categoryId} required>
						<option value={0} disabled>{t.addModal.selectCategory}</option>
						{#each categories as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>

				{#if subcategories.length > 0}
					<div class="form-group">
						<label for="item-subcategory">{t.addModal.subcategory}</label>
						<select id="item-subcategory" bind:value={subcategoryId}>
							<option value={0}>{t.common.none}</option>
							{#each subcategories as sub (sub.id)}
								<option value={sub.id}>{sub.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="form-row">
					<div class="form-group">
						<label for="item-price">{t.addModal.purchasePrice}</label>
						<input
							id="item-price"
							type="number"
							step="0.01"
							min="0"
							bind:value={purchasePrice}
							placeholder="0.00"
						/>
					</div>
					<div class="form-group">
						<label for="item-quantity">{t.addModal.quantity}</label>
						<input
							id="item-quantity"
							type="number"
							min="1"
							bind:value={quantity}
						/>
					</div>
				</div>

				<div class="form-group">
					<label for="item-date">{t.addModal.purchaseDate}</label>
					<input id="item-date" type="date" bind:value={purchaseDate} />
				</div>

				<div class="form-group">
					<label for="item-notes">{t.common.notes}</label>
					<textarea
						id="item-notes"
						bind:value={notes}
						rows="3"
						placeholder={t.addModal.optionalNotes}
					></textarea>
				</div>

				<button type="submit" class="submit-btn" disabled={submitting}>
					{submitting ? t.addModal.adding : t.addModal.addItem}
				</button>
			</form>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
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

	.modal-sheet {
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

	.sheet-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px 20px calc(32px + env(safe-area-inset-bottom, 0px));
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.sheet-body::-webkit-scrollbar {
		display: none;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 6px;
		font-family: 'Poppins', sans-serif;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 14px 16px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: var(--radius-s);
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		background: rgba(255, 255, 255, 0.8);
		color: var(--text-dark);
		outline: none;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		border-color: var(--accent-pink);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 60px;
	}

	.form-row {
		display: flex;
		gap: 12px;
	}

	.form-row .form-group {
		flex: 1;
	}

	.submit-btn {
		width: 100%;
		padding: 16px;
		background: var(--primary-gradient);
		border: none;
		border-radius: 50px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		margin-top: 8px;
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.submit-btn:active {
		transform: scale(0.97);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
