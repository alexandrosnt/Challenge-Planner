<script>
	import { logUsage, getUsageLog, logDeclutter, getItemWithStats, markItemUsedUp, updateItem, deleteItem, getCategories, getSubcategories } from '$lib/db/queries';
	import { getAuthState } from '$lib/stores/auth.svelte';
	import { triggerRefresh } from '$lib/stores/refresh.svelte';
	/** @typedef {import('$lib/db/queries').Item} Item */
	/** @typedef {import('$lib/db/queries').UsageLogEntry} UsageLogEntry */
	/** @typedef {import('$lib/db/queries').Category} Category */
	/** @typedef {import('$lib/db/queries').Subcategory} Subcategory */
	import { t } from '$lib/i18n/index.svelte';
	import StarRating from './StarRating.svelte';

	let auth = getAuthState();

	let { item, onClose } = $props();

	/** @type {UsageLogEntry[]} */
	let usageLog = $state([]);
	let reason = $state('');
	let method = $state('donated');
	let amountRecovered = $state('');
	let loading = $state(false);

	/** @type {Item | null} */
	let currentItem = $state(null);

	// Edit state
	let editing = $state(false);
	let confirmDelete = $state(false);
	let editName = $state('');
	let editCategoryId = $state(0);
	let editSubcategoryId = $state(0);
	let editPrice = $state('');
	let editQuantity = $state(1);
	let editNotes = $state('');
	let editRating = $state(0);
	/** @type {Category[]} */
	let categories = $state([]);
	/** @type {Subcategory[]} */
	let subcategories = $state([]);

	$effect(() => {
		if (item) {
			loadData(item.id);
		} else {
			usageLog = [];
			reason = '';
			method = 'donated';
			amountRecovered = '';
			currentItem = null;
			editing = false;
			confirmDelete = false;
		}
	});

	$effect(() => {
		if (editing && editCategoryId > 0) {
			getSubcategories(editCategoryId).then(sc => { subcategories = sc; });
		}
	});

	/** @param {number} itemId */
	async function loadData(itemId) {
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			const [refreshed, log] = await Promise.all([
				getItemWithStats(userId, itemId),
				getUsageLog(userId, itemId, 20)
			]);
			currentItem = refreshed;
			usageLog = log;
		} finally {
			loading = false;
		}
	}

	async function handleLogUsage() {
		if (!currentItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			await logUsage(userId, currentItem.id);
			triggerRefresh();
			await loadData(currentItem.id);
		} finally {
			loading = false;
		}
	}

	async function handleMarkFinished() {
		if (!currentItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			await markItemUsedUp(userId, currentItem.id);
			triggerRefresh();
			onClose();
		} finally {
			loading = false;
		}
	}

	async function handleDeclutter() {
		if (!currentItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			await logDeclutter(
				userId,
				currentItem.id,
				method,
				reason || undefined,
				method === 'sold' ? Number(amountRecovered) || 0 : 0
			);
			triggerRefresh();
			onClose();
		} finally {
			loading = false;
		}
	}

	function handleBackdropClick() {
		onClose();
	}

	/** @param {MouseEvent} e */
	function handleSheetClick(e) {
		e.stopPropagation();
	}

	/** @param {string | null} dateStr */
	function formatDate(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	/** @param {number | null} value */
	function formatCurrency(value) {
		if (value == null || isNaN(value)) return '--';
		return Number(value).toFixed(2) + '€';
	}

	async function startEdit() {
		if (!displayItem) return;
		editName = displayItem.name;
		editCategoryId = displayItem.category_id;
		editSubcategoryId = displayItem.subcategory_id ?? 0;
		editPrice = displayItem.purchase_price != null ? String(displayItem.purchase_price) : '';
		editQuantity = displayItem.quantity ?? 1;
		editNotes = displayItem.notes ?? '';
		editRating = displayItem.rating ?? 0;
		categories = await getCategories();
		if (displayItem.category_id) {
			subcategories = await getSubcategories(displayItem.category_id);
		}
		editing = true;
		confirmDelete = false;
	}

	function cancelEdit() {
		editing = false;
		confirmDelete = false;
	}

	async function handleSave() {
		if (!displayItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			await updateItem(userId, displayItem.id, {
				name: editName,
				category_id: editCategoryId,
				subcategory_id: editSubcategoryId > 0 ? editSubcategoryId : null,
				purchase_price: editPrice ? Number(editPrice) : null,
				quantity: editQuantity > 0 ? editQuantity : 1,
				notes: editNotes || null,
				rating: editRating
			});
			triggerRefresh();
			await loadData(displayItem.id);
			editing = false;
		} finally {
			loading = false;
		}
	}

	async function handleDelete() {
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		if (!displayItem) return;
		const userId = auth.currentUser?.id;
		if (!userId) return;
		loading = true;
		try {
			await deleteItem(userId, displayItem.id);
			triggerRefresh();
			onClose();
		} finally {
			loading = false;
		}
	}

	let displayItem = $derived(currentItem ?? item);
	let costPerUse = $derived(
		displayItem?.purchase_price && displayItem?.usage_count && displayItem.usage_count > 0
			? displayItem.purchase_price / displayItem.usage_count
			: null
	);
</script>

{#if item}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="detail-backdrop" onclick={handleBackdropClick}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="detail-sheet" onclick={handleSheetClick}>
			<div class="sheet-handle"></div>

			{#if displayItem}
				<!-- Header -->
				<div class="sheet-header">
					{#if editing}
						<div class="header-left">
							<h2 class="item-name">{t.itemDetail.edit}</h2>
						</div>
					{:else}
						<div class="header-left">
							<h2 class="item-name">{displayItem.name}</h2>
							<span class="status-badge"
								class:status-active={displayItem.status === 'active'}
								class:status-finished={displayItem.status === 'used_up'}
								class:status-decluttered={displayItem.status === 'decluttered'}
							>
								{#if displayItem.status === 'active'}
									{t.common.active}
								{:else if displayItem.status === 'used_up'}
									{t.common.finished}
								{:else}
									{t.common.decluttered}
								{/if}
							</span>
						</div>
					{/if}
					<div class="header-actions">
						{#if !editing}
							<button class="close-btn" onclick={startEdit} aria-label="Edit item">
								<i class="ri-pencil-line"></i>
							</button>
						{/if}
						<button class="close-btn" onclick={onClose} aria-label="Close detail sheet">
							<i class="ri-close-line"></i>
						</button>
					</div>
				</div>

				{#if editing}
					<!-- Edit Form -->
					<div class="edit-form">
						<div class="form-group">
							<label for="edit-name">{t.itemDetail.name}</label>
							<input
								id="edit-name"
								type="text"
								bind:value={editName}
							/>
						</div>

						<div class="form-group">
							<label for="edit-category">{t.itemDetail.category}</label>
							<select id="edit-category" bind:value={editCategoryId}>
								{#each categories as cat (cat.id)}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>

						{#if subcategories.length > 0}
							<div class="form-group">
								<label for="edit-subcategory">{t.itemDetail.subcategory}</label>
								<select id="edit-subcategory" bind:value={editSubcategoryId}>
									<option value={0}>{t.common.none}</option>
									{#each subcategories as sub (sub.id)}
										<option value={sub.id}>{sub.name}</option>
									{/each}
								</select>
							</div>
						{/if}

						<div class="form-group">
							<label for="edit-price">{t.itemDetail.purchasePrice}</label>
							<input
								id="edit-price"
								type="number"
								step="0.01"
								min="0"
								bind:value={editPrice}
								placeholder="0.00"
							/>
						</div>

						<div class="form-group">
							<label for="edit-quantity">{t.addModal.quantity}</label>
							<input
								id="edit-quantity"
								type="number"
								min="1"
								step="1"
								bind:value={editQuantity}
							/>
						</div>

						<div class="form-group">
							<label for="edit-notes">{t.itemDetail.notes}</label>
							<textarea
								id="edit-notes"
								bind:value={editNotes}
								rows="3"
							></textarea>
						</div>

						<div class="form-group">
							<label>{t.common.rating}</label>
							<StarRating rating={editRating} onRate={(v) => editRating = v} size="md" />
						</div>

						<div class="edit-actions">
							<button class="save-btn" onclick={handleSave} disabled={loading}>
								{loading ? t.itemDetail.saving : t.itemDetail.save}
							</button>
							<button class="cancel-btn" onclick={cancelEdit}>
								{t.itemDetail.cancel}
							</button>
						</div>

						<div class="delete-zone">
							{#if confirmDelete}
								<p class="delete-confirm-text">{t.itemDetail.deleteConfirm}</p>
							{/if}
							<button class="delete-btn" onclick={handleDelete} disabled={loading}>
								{#if loading && confirmDelete}
									{t.itemDetail.deleting}
								{:else if confirmDelete}
									{t.itemDetail.deleteConfirm}
								{:else}
									{t.itemDetail.delete}
								{/if}
							</button>
						</div>
					</div>
				{:else}
					<!-- Rating -->
					{#if displayItem.rating > 0}
						<div class="detail-rating">
							<StarRating rating={displayItem.rating} />
						</div>
					{/if}

					<!-- Stats Row -->
					<div class="stats-row">
						<div class="stat-block">
							<span class="stat-value">{formatCurrency(costPerUse)}</span>
							<span class="stat-label">{t.itemDetail.costPerUse}</span>
						</div>
						<div class="stat-block">
							<span class="stat-value">{displayItem.usage_count ?? 0}</span>
							<span class="stat-label">{t.itemDetail.totalUses}</span>
						</div>
						<div class="stat-block">
							<span class="stat-value category-label">{displayItem.category_name ?? t.itemDetail.na}</span>
							{#if displayItem.subcategory_name}
								<span class="stat-label">{displayItem.subcategory_name}</span>
							{:else}
								<span class="stat-label">{t.common.category}</span>
							{/if}
						</div>
					</div>

					<!-- Log Usage Button -->
					{#if displayItem.status === 'active'}
						<button class="log-usage-btn" onclick={handleLogUsage} disabled={loading}>
							<i class="ri-add-circle-line"></i>
							{loading ? t.itemDetail.logging : t.itemDetail.logUsage}
						</button>
						<button class="finished-btn" onclick={handleMarkFinished} disabled={loading}>
							<i class="ri-checkbox-circle-line"></i>
							{t.itemDetail.markFinished}
						</button>
					{/if}

					<!-- Usage Log -->
					<div class="section-title">{t.itemDetail.usageHistory}</div>
					{#if usageLog.length === 0}
						<p class="empty-text">{t.itemDetail.noUsageYet}</p>
					{:else}
						<div class="usage-list">
							{#each usageLog as entry (entry.id)}
								<div class="usage-row">
									<i class="ri-checkbox-circle-line usage-icon"></i>
									<div class="usage-info">
										<span class="usage-date">{formatDate(entry.used_at)}</span>
										{#if entry.notes}
											<span class="usage-notes">{entry.notes}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Declutter Section (active items only) -->
					{#if displayItem.status === 'active'}
						<div class="declutter-section">
							<div class="section-title">{t.itemDetail.declutterThisItem}</div>

							<div class="form-group">
								<label for="declutter-reason">{t.itemDetail.reason}</label>
								<textarea
									id="declutter-reason"
									bind:value={reason}
									rows="3"
									placeholder={t.itemDetail.whyLettingGo}
								></textarea>
							</div>

							<div class="form-group">
								<label for="declutter-method">{t.itemDetail.method}</label>
								<select id="declutter-method" bind:value={method}>
									<option value="donated">{t.itemDetail.donated}</option>
									<option value="sold">{t.itemDetail.sold}</option>
									<option value="trashed">{t.itemDetail.trashed}</option>
									<option value="gifted">{t.itemDetail.gifted}</option>
								</select>
							</div>

							{#if method === 'sold'}
								<div class="form-group">
									<label for="declutter-amount">{t.itemDetail.amountRecovered}</label>
									<input
										id="declutter-amount"
										type="number"
										step="0.01"
										min="0"
										bind:value={amountRecovered}
										placeholder="0.00"
									/>
								</div>
							{/if}

							<button class="declutter-btn" onclick={handleDeclutter} disabled={loading}>
								{loading ? t.itemDetail.processing : t.itemDetail.declutterItem}
							</button>
						</div>
					{/if}
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.detail-backdrop {
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

	.detail-sheet {
		width: 100%;
		max-width: 500px;
		max-height: 85vh;
		background: #fdfbf7;
		border-radius: var(--radius-l) var(--radius-l) 0 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.detail-sheet::-webkit-scrollbar {
		display: none;
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
		align-items: flex-start;
		justify-content: space-between;
		padding: 20px 20px 0;
		gap: 12px;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-width: 0;
	}

	.header-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.item-name {
		font-family: 'Poppins', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--text-dark);
		margin: 0;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.status-badge {
		display: inline-flex;
		align-self: flex-start;
		padding: 4px 12px;
		border-radius: 50px;
		font-size: 12px;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		letter-spacing: 0.3px;
	}

	.status-active {
		background: rgba(76, 175, 80, 0.15);
		color: #2e7d32;
	}

	.status-finished {
		background: rgba(var(--accent-sage-rgb, 164, 180, 148), 0.2);
		color: var(--accent-sage, #6b8f5e);
	}

	.status-decluttered {
		background: rgba(0, 0, 0, 0.06);
		color: var(--text-soft);
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

	.detail-rating {
		padding: 8px 20px 0;
	}

	/* Stats Row */
	.stats-row {
		display: flex;
		gap: 8px;
		padding: 20px 20px 0;
	}

	.stat-block {
		flex: 1;
		background: var(--glass-bg, rgba(255, 255, 255, 0.6));
		border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.3));
		border-radius: var(--radius-m, 12px);
		padding: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.stat-value {
		font-family: 'Poppins', sans-serif;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-dark);
	}

	.stat-value.category-label {
		font-size: 13px;
		font-weight: 600;
		text-align: center;
		line-height: 1.2;
	}

	.stat-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.3px;
		text-align: center;
	}

	/* Log Usage Button */
	.log-usage-btn {
		width: calc(100% - 40px);
		margin: 20px 20px 0;
		padding: 14px;
		background: var(--primary-gradient);
		border: none;
		border-radius: 50px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.log-usage-btn:active {
		transform: scale(0.97);
	}

	.log-usage-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.log-usage-btn i {
		font-size: 18px;
	}

	.finished-btn {
		width: calc(100% - 40px);
		margin: 10px 20px 0;
		padding: 14px;
		background: var(--accent-sage, #94B49F);
		border: none;
		border-radius: 50px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.finished-btn:active {
		transform: scale(0.97);
	}

	.finished-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Section Title */
	.section-title {
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-dark);
		padding: 20px 20px 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.empty-text {
		padding: 0 20px 12px;
		font-size: 14px;
		color: var(--text-soft);
		font-family: 'Poppins', sans-serif;
		margin: 0;
	}

	/* Usage Log */
	.usage-list {
		padding: 0 20px 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.usage-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: var(--radius-s, 8px);
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(0, 0, 0, 0.03);
	}

	.usage-icon {
		color: var(--accent-sage, #6b8f5e);
		font-size: 16px;
		flex-shrink: 0;
	}

	.usage-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.usage-date {
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-dark);
	}

	.usage-notes {
		font-size: 12px;
		color: var(--text-soft);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Declutter Section */
	.declutter-section {
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		margin-top: 12px;
		padding-bottom: calc(32px + env(safe-area-inset-bottom, 0px));
	}

	.form-group {
		margin: 0 20px 16px;
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

	.form-group textarea,
	.form-group select,
	.form-group input {
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

	.form-group textarea:focus,
	.form-group select:focus,
	.form-group input:focus {
		border-color: var(--accent-pink);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 60px;
	}

	.declutter-btn {
		width: calc(100% - 40px);
		margin: 4px 20px 0;
		padding: 14px;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 50px;
		color: var(--text-dark);
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.declutter-btn:active {
		transform: scale(0.97);
		background: rgba(0, 0, 0, 0.1);
	}

	.declutter-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Edit Form */
	.edit-form {
		padding: 20px 0 calc(32px + env(safe-area-inset-bottom, 0px));
	}

	.edit-actions {
		display: flex;
		gap: 10px;
		padding: 4px 20px 0;
	}

	.save-btn {
		flex: 1;
		padding: 14px;
		background: var(--primary-gradient);
		border: none;
		border-radius: 50px;
		color: white;
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, opacity 0.2s ease;
	}

	.save-btn:active {
		transform: scale(0.97);
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-btn {
		flex: 1;
		padding: 14px;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 50px;
		color: var(--text-dark);
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.cancel-btn:active {
		transform: scale(0.97);
		background: rgba(0, 0, 0, 0.1);
	}

	/* Delete Zone */
	.delete-zone {
		margin-top: 24px;
		padding: 0 20px;
	}

	.delete-confirm-text {
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		color: #C62828;
		text-align: center;
		margin: 0 0 10px;
	}

	.delete-btn {
		width: 100%;
		padding: 14px;
		background: #FFEBEE;
		color: #C62828;
		border: 1px solid rgba(198, 40, 40, 0.15);
		border-radius: 50px;
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.delete-btn:active {
		transform: scale(0.97);
		background: #FFCDD2;
	}

	.delete-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
