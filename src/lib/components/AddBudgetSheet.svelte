<script lang="ts">
	import { onMount } from 'svelte';
	import { getCategories, addBudget, type Category } from '$lib/db/queries';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { closeModal } from '$lib/stores/modal.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { onAdded }: { onAdded?: () => void } = $props();

	let auth = getAuthState();

	let categories: Category[] = $state([]);
	let categoryId = $state(0);
	let monthlyLimit = $state('');
	let month = $state(new Date().toISOString().slice(0, 7));
	let carryover = $state(false);
	let submitting = $state(false);

	onMount(async () => {
		categories = await getCategories();
	});

	function resetForm() {
		categoryId = 0;
		monthlyLimit = '';
		month = new Date().toISOString().slice(0, 7);
		carryover = false;
	}

	function handleBackdropClick() {
		closeModal();
		resetForm();
	}

	function handleSheetClick(e: MouseEvent) {
		e.stopPropagation();
	}

	async function handleSubmit() {
		if (!categoryId || !monthlyLimit) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addBudget(
				userId,
				categoryId,
				Number(monthlyLimit),
				month || undefined,
				carryover
			);
			closeModal();
			resetForm();
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
			<h2 class="sheet-title">{t.budgetPage.addBudget}</h2>
			<button class="close-btn" onclick={() => { closeModal(); resetForm(); }} aria-label="Close">
				<i class="ri-close-line"></i>
			</button>
		</div>

		<div class="sheet-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="budget-category">{t.common.category}</label>
					<select id="budget-category" bind:value={categoryId} required>
						<option value={0} disabled>{t.addModal.selectCategory}</option>
						{#each categories as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="budget-limit">{t.addModal.monthlyLimit}</label>
					<input
						id="budget-limit"
						type="number"
						step="0.01"
						min="0"
						bind:value={monthlyLimit}
						placeholder="0.00"
						required
					/>
				</div>

				<div class="form-group">
					<label for="budget-month">{t.addModal.month}</label>
					<input id="budget-month" type="month" bind:value={month} />
				</div>

				<div class="form-group checkbox-group">
					<label for="budget-carryover">
						<input id="budget-carryover" type="checkbox" bind:checked={carryover} />
						<span>{t.addModal.carryOver}</span>
					</label>
				</div>

				<button type="submit" class="submit-btn" disabled={submitting}>
					{submitting ? t.addModal.adding : t.addModal.addBudget}
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
		padding: 20px 20px 32px;
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
	.form-group select {
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
	.form-group select:focus {
		border-color: var(--accent-pink);
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 10px;
		text-transform: none;
		font-weight: 500;
		font-size: 15px;
		color: var(--text-dark);
		cursor: pointer;
	}

	.checkbox-group input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: var(--accent-pink);
		flex-shrink: 0;
	}

	.checkbox-group span {
		font-size: 14px;
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
