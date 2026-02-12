<script lang="ts">
	import { onMount } from 'svelte';
	import { addPurchase, getCategories, type Category } from '$lib/db/queries';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { closeModal } from '$lib/stores/modal.svelte';
	import { triggerRefresh } from '$lib/stores/refresh.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { onAdded }: { onAdded?: () => void } = $props();

	let auth = getAuthState();

	let categories: Category[] = $state([]);
	let name = $state('');
	let amount = $state('');
	let categoryId = $state(0);
	let purchaseDate = $state(new Date().toISOString().slice(0, 10));
	let notes = $state('');
	let submitting = $state(false);

	onMount(async () => {
		categories = await getCategories();
	});

	function resetForm() {
		name = '';
		amount = '';
		categoryId = 0;
		purchaseDate = new Date().toISOString().slice(0, 10);
		notes = '';
	}

	function handleBackdropClick() {
		closeModal();
		resetForm();
	}

	function handleSheetClick(e: MouseEvent) {
		e.stopPropagation();
	}

	async function handleSubmit() {
		if (!name.trim() || !amount || categoryId <= 0) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addPurchase(
				userId,
				name.trim(),
				parseFloat(amount),
				categoryId,
				null,
				null,
				purchaseDate,
				notes.trim() || null,
				null
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
<div class="sheet-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="sheet-container" onclick={handleSheetClick}>
		<div class="sheet-handle"></div>

		<div class="sheet-header">
			<h2 class="sheet-title">{t.addPurchase.title}</h2>
			<button class="close-btn" onclick={() => { closeModal(); resetForm(); }} aria-label="Close">
				<i class="ri-close-line"></i>
			</button>
		</div>

		<div class="sheet-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="purchase-name">{t.addPurchase.whatDidYouBuy}</label>
					<input
						id="purchase-name"
						type="text"
						bind:value={name}
						placeholder={t.addPurchase.whatDidYouBuy}
						required
					/>
				</div>

				<div class="form-group">
					<label for="purchase-amount">{t.addPurchase.amount}</label>
					<input
						id="purchase-amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={amount}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="form-group">
					<label for="purchase-category">{t.addPurchase.category}</label>
					<select id="purchase-category" bind:value={categoryId} required>
						<option value={0} disabled>-- {t.addPurchase.category} --</option>
						{#each categories as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="purchase-date">{t.addPurchase.date}</label>
					<input id="purchase-date" type="date" bind:value={purchaseDate} />
				</div>

				<div class="form-group">
					<label for="purchase-notes">{t.addPurchase.notes}</label>
					<textarea
						id="purchase-notes"
						bind:value={notes}
						rows="2"
						placeholder={t.addPurchase.optionalNotes}
					></textarea>
				</div>

				<button type="submit" class="submit-btn" disabled={submitting}>
					{submitting ? t.addPurchase.adding : t.addPurchase.submit}
				</button>
			</form>
		</div>
	</div>
</div>

<style>
	.sheet-backdrop {
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

	.sheet-container {
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
		border-radius: var(--radius-s, 8px);
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
