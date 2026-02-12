<script lang="ts">
	import { addShoppingItem } from '$lib/db/queries';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { closeModal } from '$lib/stores/modal.svelte';
	import { triggerRefresh } from '$lib/stores/refresh.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { onAdded }: { onAdded?: () => void } = $props();

	let auth = getAuthState();

	let name = $state('');
	let quantity = $state(1);
	let notes = $state('');
	let submitting = $state(false);

	function handleBackdropClick() {
		closeModal();
	}

	function handleSheetClick(e: MouseEvent) {
		e.stopPropagation();
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addShoppingItem(userId, name.trim(), quantity, notes.trim() || null);
			closeModal();
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
	<div class="sheet" onclick={handleSheetClick}>
		<div class="sheet-handle"></div>

		<div class="sheet-body">
			<h2 class="sheet-title">{t.shoppingList.addItem}</h2>

			<form onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="shopping-name">{t.shoppingList.itemName}</label>
					<input
						id="shopping-name"
						type="text"
						bind:value={name}
						placeholder={t.shoppingList.itemName}
						required
					/>
				</div>

				<div class="form-group">
					<label for="shopping-quantity">{t.shoppingList.quantity}</label>
					<input
						id="shopping-quantity"
						type="number"
						min="1"
						bind:value={quantity}
					/>
				</div>

				<div class="form-group">
					<label for="shopping-notes">{t.shoppingList.notes}</label>
					<textarea
						id="shopping-notes"
						bind:value={notes}
						rows="3"
						placeholder={t.addModal.optionalNotes}
					></textarea>
				</div>

				<button type="submit" class="submit-btn" disabled={submitting}>
					{submitting ? t.shoppingList.adding : t.shoppingList.addItem}
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

	.sheet {
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

	.sheet-title {
		font-family: 'Poppins', sans-serif;
		font-size: 20px;
		font-weight: 700;
		color: var(--text-dark);
		margin: 0 0 20px;
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
