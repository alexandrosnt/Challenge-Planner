<script>
	import { onMount } from 'svelte';
	import { dragscroll } from '$lib/actions/dragscroll';
	import { getModalState, closeAddModal } from '$lib/stores/modal.svelte';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import {
		getCategories,
		getSubcategories,
		addItem,
		addPurchase,
		addChallenge,
		addBudget,
		addWishlistItem
	} from '$lib/db/queries';

	let auth = getAuthState();

	let modal = getModalState();

	/** @type {import('$lib/db/queries').Category[]} */
	let categories = $state([]);

	/** @type {import('$lib/db/queries').Subcategory[]} */
	let subcategories = $state([]);

	let activeTab = $state('item');
	let submitting = $state(false);

	const tabs = [
		{ key: 'item', label: t.addModal.item },
		{ key: 'purchase', label: t.addModal.purchase },
		{ key: 'challenge', label: t.addModal.challenge },
		{ key: 'budget', label: t.addModal.budget },
		{ key: 'wishlist', label: t.addModal.wishlist }
	];

	// Item form state
	let itemName = $state('');
	let itemCategory = $state(0);
	let itemSubcategory = $state(0);
	let itemPrice = $state('');
	let itemDate = $state('');
	let itemQuantity = $state(1);
	let itemNotes = $state('');

	// Purchase form state
	let purchaseName = $state('');
	let purchaseAmount = $state('');
	let purchaseCategory = $state(0);
	let purchaseSubcategory = $state(0);
	let purchaseDate = $state('');
	let purchaseNotes = $state('');
	let purchaseFeeling = $state('');

	// Challenge form state
	let challengeTitle = $state('');
	let challengeTarget = $state('');
	let challengeIcon = $state('ri-trophy-line');
	let challengeDeadline = $state('');
	let challengeCategory = $state(0);

	// Budget form state
	let budgetCategory = $state(0);
	let budgetLimit = $state('');
	let budgetMonth = $state(new Date().toISOString().slice(0, 7));
	let budgetCarryover = $state(false);

	// Wishlist form state
	let wishlistName = $state('');
	let wishlistCategory = $state(0);
	let wishlistPrice = $state('');
	let wishlistNotes = $state('');

	// Track which category field is relevant per tab for subcategory loading
	let currentCategoryId = $derived(
		activeTab === 'item' ? itemCategory :
		activeTab === 'purchase' ? purchaseCategory :
		0
	);

	$effect(() => {
		const catId = currentCategoryId;
		if (catId > 0) {
			getSubcategories(catId).then((result) => {
				subcategories = result;
			});
		} else {
			subcategories = [];
		}
	});

	onMount(async () => {
		categories = await getCategories();
	});

	function resetForms() {
		itemName = '';
		itemCategory = 0;
		itemSubcategory = 0;
		itemPrice = '';
		itemDate = '';
		itemQuantity = 1;
		itemNotes = '';

		purchaseName = '';
		purchaseAmount = '';
		purchaseCategory = 0;
		purchaseSubcategory = 0;
		purchaseDate = '';
		purchaseNotes = '';
		purchaseFeeling = '';

		challengeTitle = '';
		challengeTarget = '';
		challengeIcon = 'ri-trophy-line';
		challengeDeadline = '';
		challengeCategory = 0;

		budgetCategory = 0;
		budgetLimit = '';
		budgetMonth = new Date().toISOString().slice(0, 7);
		budgetCarryover = false;

		wishlistName = '';
		wishlistCategory = 0;
		wishlistPrice = '';
		wishlistNotes = '';

		subcategories = [];
	}

	function handleBackdropClick() {
		closeAddModal();
		resetForms();
		activeTab = 'item';
	}

	/** @param {MouseEvent} e */
	function handleSheetClick(e) {
		e.stopPropagation();
	}

	async function submitItem() {
		if (!itemName || !itemCategory) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addItem(
				userId,
				itemName,
				itemCategory,
				itemSubcategory || null,
				itemPrice ? Number(itemPrice) : null,
				itemDate || null,
				itemQuantity,
				itemNotes || null
			);
			closeAddModal();
			resetForms();
			activeTab = 'item';
		} finally {
			submitting = false;
		}
	}

	async function submitPurchase() {
		if (!purchaseName || !purchaseAmount || !purchaseCategory) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addPurchase(
				userId,
				purchaseName,
				Number(purchaseAmount),
				purchaseCategory,
				purchaseSubcategory || null,
				null,
				purchaseDate || null,
				purchaseNotes || null,
				purchaseFeeling || null
			);
			closeAddModal();
			resetForms();
			activeTab = 'item';
		} finally {
			submitting = false;
		}
	}

	async function submitChallenge() {
		if (!challengeTitle || !challengeTarget) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addChallenge(
				userId,
				challengeTitle,
				Number(challengeTarget),
				challengeIcon || 'ri-trophy-line',
				challengeDeadline || null,
				challengeCategory || null
			);
			closeAddModal();
			resetForms();
			activeTab = 'item';
		} finally {
			submitting = false;
		}
	}

	async function submitBudget() {
		if (!budgetCategory || !budgetLimit) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addBudget(
				userId,
				budgetCategory,
				Number(budgetLimit),
				budgetMonth || undefined,
				budgetCarryover
			);
			closeAddModal();
			resetForms();
			activeTab = 'item';
		} finally {
			submitting = false;
		}
	}

	async function submitWishlist() {
		if (!wishlistName) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		submitting = true;
		try {
			await addWishlistItem(
				userId,
				wishlistName,
				wishlistCategory || null,
				null,
				wishlistPrice ? Number(wishlistPrice) : null,
				wishlistNotes || null
			);
			closeAddModal();
			resetForms();
			activeTab = 'item';
		} finally {
			submitting = false;
		}
	}
</script>

{#if modal.open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-sheet" onclick={handleSheetClick}>
			<div class="sheet-handle"></div>

			<div class="tab-row" use:dragscroll>
				{#each tabs as tab (tab.key)}
					<button
						class="tab-pill {activeTab === tab.key ? 'active' : ''}"
						onclick={() => activeTab = tab.key}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="sheet-body">
				{#if activeTab === 'item'}
					<form onsubmit={(e) => { e.preventDefault(); submitItem(); }}>
						<div class="form-group">
							<label for="item-name">{t.common.name}</label>
							<input id="item-name" type="text" bind:value={itemName} placeholder={t.addModal.productName} required />
						</div>
						<div class="form-group">
							<label for="item-category">{t.common.category}</label>
							<select id="item-category" bind:value={itemCategory} required>
								<option value={0} disabled>{t.addModal.selectCategory}</option>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						{#if subcategories.length > 0}
							<div class="form-group">
								<label for="item-subcategory">{t.addModal.subcategory}</label>
								<select id="item-subcategory" bind:value={itemSubcategory}>
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
								<input id="item-price" type="number" step="0.01" min="0" bind:value={itemPrice} placeholder="0.00" />
							</div>
							<div class="form-group">
								<label for="item-quantity">{t.addModal.quantity}</label>
								<input id="item-quantity" type="number" min="1" bind:value={itemQuantity} />
							</div>
						</div>
						<div class="form-group">
							<label for="item-date">{t.addModal.purchaseDate}</label>
							<input id="item-date" type="date" bind:value={itemDate} />
						</div>
						<div class="form-group">
							<label for="item-notes">{t.common.notes}</label>
							<textarea id="item-notes" bind:value={itemNotes} rows="3" placeholder={t.addModal.optionalNotes}></textarea>
						</div>
						<button type="submit" class="submit-btn" disabled={submitting}>
							{submitting ? t.addModal.adding : t.addModal.addItem}
						</button>
					</form>

				{:else if activeTab === 'purchase'}
					<form onsubmit={(e) => { e.preventDefault(); submitPurchase(); }}>
						<div class="form-group">
							<label for="purchase-name">{t.common.name}</label>
							<input id="purchase-name" type="text" bind:value={purchaseName} placeholder={t.addModal.whatDidYouBuy} required />
						</div>
						<div class="form-group">
							<label for="purchase-amount">{t.addModal.amount}</label>
							<input id="purchase-amount" type="number" step="0.01" min="0" bind:value={purchaseAmount} placeholder="0.00" required />
						</div>
						<div class="form-group">
							<label for="purchase-category">{t.common.category}</label>
							<select id="purchase-category" bind:value={purchaseCategory} required>
								<option value={0} disabled>{t.addModal.selectCategory}</option>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						{#if subcategories.length > 0}
							<div class="form-group">
								<label for="purchase-subcategory">{t.addModal.subcategory}</label>
								<select id="purchase-subcategory" bind:value={purchaseSubcategory}>
									<option value={0}>{t.common.none}</option>
									{#each subcategories as sub (sub.id)}
										<option value={sub.id}>{sub.name}</option>
									{/each}
								</select>
							</div>
						{/if}
						<div class="form-group">
							<label for="purchase-date">{t.addModal.purchaseDate}</label>
							<input id="purchase-date" type="date" bind:value={purchaseDate} />
						</div>
						<div class="form-group">
							<label for="purchase-notes">{t.common.notes}</label>
							<textarea id="purchase-notes" bind:value={purchaseNotes} rows="3" placeholder={t.addModal.optionalNotes}></textarea>
						</div>
						<input type="hidden" bind:value={purchaseFeeling} />
						<button type="submit" class="submit-btn" disabled={submitting}>
							{submitting ? t.addModal.adding : t.addModal.addPurchase}
						</button>
					</form>

				{:else if activeTab === 'challenge'}
					<form onsubmit={(e) => { e.preventDefault(); submitChallenge(); }}>
						<div class="form-group">
							<label for="challenge-title">{t.addModal.challengeTitle}</label>
							<input id="challenge-title" type="text" bind:value={challengeTitle} placeholder={t.addModal.challengeName} required />
						</div>
						<div class="form-row">
							<div class="form-group">
								<label for="challenge-target">{t.addModal.targetCount}</label>
								<input id="challenge-target" type="number" min="1" bind:value={challengeTarget} placeholder="10" required />
							</div>
							<div class="form-group">
								<label for="challenge-icon">{t.addModal.icon}</label>
								<input id="challenge-icon" type="text" bind:value={challengeIcon} placeholder="ri-trophy-line" />
							</div>
						</div>
						<div class="form-group">
							<label for="challenge-deadline">{t.addModal.deadline}</label>
							<input id="challenge-deadline" type="date" bind:value={challengeDeadline} />
						</div>
						<div class="form-group">
							<label for="challenge-category">{t.addModal.categoryOptional}</label>
							<select id="challenge-category" bind:value={challengeCategory}>
								<option value={0}>{t.common.none}</option>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						<button type="submit" class="submit-btn" disabled={submitting}>
							{submitting ? t.addModal.adding : t.addModal.addChallenge}
						</button>
					</form>

				{:else if activeTab === 'budget'}
					<form onsubmit={(e) => { e.preventDefault(); submitBudget(); }}>
						<div class="form-group">
							<label for="budget-category">{t.common.category}</label>
							<select id="budget-category" bind:value={budgetCategory} required>
								<option value={0} disabled>{t.addModal.selectCategory}</option>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						<div class="form-group">
							<label for="budget-limit">{t.addModal.monthlyLimit}</label>
							<input id="budget-limit" type="number" step="0.01" min="0" bind:value={budgetLimit} placeholder="0.00" required />
						</div>
						<div class="form-group">
							<label for="budget-month">{t.addModal.month}</label>
							<input id="budget-month" type="month" bind:value={budgetMonth} />
						</div>
						<div class="form-group checkbox-group">
							<label for="budget-carryover">
								<input id="budget-carryover" type="checkbox" bind:checked={budgetCarryover} />
								<span>{t.addModal.carryOver}</span>
							</label>
						</div>
						<button type="submit" class="submit-btn" disabled={submitting}>
							{submitting ? t.addModal.adding : t.addModal.addBudget}
						</button>
					</form>

				{:else if activeTab === 'wishlist'}
					<form onsubmit={(e) => { e.preventDefault(); submitWishlist(); }}>
						<div class="form-group">
							<label for="wishlist-name">{t.common.name}</label>
							<input id="wishlist-name" type="text" bind:value={wishlistName} placeholder={t.addModal.whatDoYouWant} required />
						</div>
						<div class="form-group">
							<label for="wishlist-category">{t.addModal.categoryOptional}</label>
							<select id="wishlist-category" bind:value={wishlistCategory}>
								<option value={0}>{t.common.none}</option>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>
						<div class="form-group">
							<label for="wishlist-price">{t.addModal.estimatedPrice}</label>
							<input id="wishlist-price" type="number" step="0.01" min="0" bind:value={wishlistPrice} placeholder="0.00" />
						</div>
						<div class="form-group">
							<label for="wishlist-notes">{t.common.notes}</label>
							<textarea id="wishlist-notes" bind:value={wishlistNotes} rows="3" placeholder={t.addModal.whyDoYouWant}></textarea>
						</div>
						<button type="submit" class="submit-btn" disabled={submitting}>
							{submitting ? t.addModal.adding : t.addModal.addToWishlist}
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

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

	.tab-row {
		display: flex;
		gap: 8px;
		padding: 16px 20px 0;
		overflow-x: auto;
		flex-shrink: 0;
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.tab-row::-webkit-scrollbar {
		display: none;
	}

	.tab-pill {
		padding: 8px 16px;
		border-radius: 50px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-soft);
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.tab-pill.active {
		background: var(--accent-pink);
		color: white;
		border-color: var(--accent-pink);
		font-weight: 600;
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
