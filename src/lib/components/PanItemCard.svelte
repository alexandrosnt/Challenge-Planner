<script lang="ts">
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import SelectableCheckbox from './SelectableCheckbox.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import StarRating from './StarRating.svelte';

	interface PanItem {
		id: number;
		item_id: number;
		quantity: number;
		emptied: number;
		item_name: string;
		category_name: string;
		category_icon: string;
		rating: number;
	}

	let {
		item,
		onMarkEmptied,
		onUndoEmptied,
		onRemove,
		onEdit,
		editing = false,
		editQuantity = $bindable(1),
		onSaveEdit,
		onCancelEdit,
		selectMode = false,
		selected = false,
		onSelect,
	}: {
		item: PanItem;
		onMarkEmptied?: (id: number) => void;
		onUndoEmptied?: (id: number) => void;
		onRemove?: (id: number) => void;
		onEdit?: (id: number) => void;
		editing?: boolean;
		editQuantity?: number;
		onSaveEdit?: () => void;
		onCancelEdit?: () => void;
		selectMode?: boolean;
		selected?: boolean;
		onSelect?: (id: number) => void;
	} = $props();

	let showDetail = $state(false);

	let percentage = $derived(
		item.quantity > 0 ? Math.round((item.emptied / item.quantity) * 100) : 0
	);
	let isComplete = $derived(item.emptied >= item.quantity);

	function openDetail() {
		if (!selectMode) showDetail = true;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pan-item-card"
	class:selected-card={selectMode && selected}
	onclick={selectMode ? () => onSelect?.(item.id) : undefined}
>
	<div class="card-header">
		{#if selectMode}
			<SelectableCheckbox checked={selected} onToggle={() => onSelect?.(item.id)} />
		{/if}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="icon-box" onclick={openDetail}>
			<i class={item.category_icon}></i>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="item-info" onclick={openDetail}>
			<h4 class="item-name">{item.item_name}</h4>
			<span class="category-name">{item.category_name}</span>
			{#if item.rating > 0}
				<StarRating rating={item.rating} />
			{/if}
		</div>
		{#if !selectMode}
			<div class="action-btns">
				{#if onEdit}
					<button class="action-btn" onclick={() => onEdit(item.id)} aria-label={t.panProject.editQuantity}>
						<i class="ri-pencil-line"></i>
					</button>
				{/if}
				{#if onRemove}
					<button class="action-btn remove" onclick={() => onRemove(item.id)} aria-label={t.panProject.removeItem}>
						<i class="ri-close-line"></i>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if editing}
		<div class="inline-edit">
			<label class="edit-label" for="edit-qty-{item.id}">{t.panProject.editQuantity}</label>
			<input
				id="edit-qty-{item.id}"
				class="edit-input"
				type="number"
				min="1"
				bind:value={editQuantity}
			/>
			<div class="edit-actions">
				<button class="edit-btn-cancel" onclick={onCancelEdit}>
					{t.common.cancel}
				</button>
				<button class="edit-btn-save" onclick={onSaveEdit}>
					{t.panProject.save}
				</button>
			</div>
		</div>
	{:else}
		<div class="progress-section">
			<div class="progress-text">
				<span class="progress-label">{t.panProject.progress}</span>
				<span class="progress-count">{item.emptied} {t.panProject.of} {item.quantity} {t.panProject.emptied}</span>
			</div>
			<ProgressBar value={percentage} height="8px" />
		</div>

		<div class="btn-row">
			{#if onUndoEmptied && item.emptied > 0}
				<button
					class="undo-emptied-btn"
					onclick={() => onUndoEmptied(item.id)}
				>
					<i class="ri-arrow-go-back-line"></i>
					{t.panProject.undoEmptied}
				</button>
			{/if}
			{#if onMarkEmptied}
				<button
					class="mark-emptied-btn"
					class:complete={isComplete}
					onclick={() => onMarkEmptied(item.id)}
				>
					{#if isComplete}
						<i class="ri-check-double-line"></i>
					{:else}
						<i class="ri-check-line"></i>
					{/if}
					{t.panProject.markEmptied}
				</button>
			{/if}
		</div>
	{/if}
</div>

{#if showDetail}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="detail-backdrop" onclick={() => showDetail = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="detail-sheet" onclick={(e) => e.stopPropagation()}>
			<div class="detail-handle"></div>
			<div class="detail-header">
				<div class="detail-icon-box">
					<i class={item.category_icon}></i>
				</div>
				<button class="detail-close" onclick={() => showDetail = false} aria-label="Close">
					<i class="ri-close-line"></i>
				</button>
			</div>
			<h3 class="detail-name">{item.item_name}</h3>
			<span class="detail-category">{item.category_name}</span>
			{#if item.rating > 0}
				<div class="detail-rating">
					<StarRating rating={item.rating} />
				</div>
			{/if}
			<div class="detail-stats">
				<div class="detail-stat">
					<span class="detail-stat-value">{item.quantity}</span>
					<span class="detail-stat-label">{t.panProject.quantity}</span>
				</div>
				<div class="detail-stat">
					<span class="detail-stat-value">{item.emptied}</span>
					<span class="detail-stat-label">{t.panProject.emptied}</span>
				</div>
				<div class="detail-stat">
					<span class="detail-stat-value">{percentage}%</span>
					<span class="detail-stat-label">{t.panProject.progress}</span>
				</div>
			</div>
			<ProgressBar value={percentage} height="8px" />
		</div>
	</div>
{/if}

<style>
	.pan-item-card {
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-m);
		box-shadow: var(--glass-shadow);
		padding: 20px;
		margin-bottom: 16px;
	}

	.pan-item-card.selected-card {
		border-color: var(--accent-pink);
		box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.15);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.icon-box {
		width: 46px;
		height: 46px;
		background: #FFF0F3;
		border-radius: var(--radius-s);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		color: var(--accent-pink);
		flex-shrink: 0;
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-dark);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-name {
		font-size: 12px;
		color: var(--text-soft);
		font-weight: 500;
	}

	.action-btns {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.action-btn {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-soft);
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.action-btn:active {
		background: rgba(99, 102, 241, 0.15);
		color: var(--accent-primary, #6366f1);
		transform: scale(0.9);
	}

	.action-btn.remove:active {
		background: rgba(255, 107, 129, 0.15);
		color: var(--accent-pink);
	}

	.progress-section {
		margin-bottom: 14px;
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		font-weight: 600;
	}

	.progress-label {
		color: var(--text-dark);
	}

	.progress-count {
		color: var(--text-soft);
	}

	.btn-row {
		display: flex;
		gap: 8px;
	}

	.undo-emptied-btn {
		flex: 0 0 auto;
		padding: 10px 14px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 50px;
		background: white;
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-soft);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition: 0.2s;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.undo-emptied-btn:active {
		transform: scale(0.98);
		background: #f5f5f5;
	}

	.mark-emptied-btn {
		flex: 1;
		padding: 10px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 50px;
		background: white;
		font-family: 'Poppins', sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent-pink);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition: 0.2s;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.mark-emptied-btn:active:not(:disabled) {
		transform: scale(0.98);
		background: #FFF0F3;
	}

	.mark-emptied-btn.complete {
		background: #E8F5E9;
		color: var(--accent-sage);
		border-color: transparent;
		cursor: default;
	}

	.mark-emptied-btn:disabled {
		opacity: 0.85;
	}

	.inline-edit {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.edit-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.edit-input {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-s);
		font-family: 'Poppins', sans-serif;
		font-size: 15px;
		color: var(--text-dark);
		background: white;
		outline: none;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.edit-input:focus {
		border-color: var(--accent-primary, #6366f1);
	}

	.edit-actions {
		display: flex;
		gap: 10px;
	}

	.edit-btn-cancel,
	.edit-btn-save {
		flex: 1;
		padding: 10px;
		border-radius: 50px;
		font-family: 'Poppins', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: 0.2s;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.edit-btn-cancel {
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		color: var(--text-soft);
	}

	.edit-btn-cancel:active {
		transform: scale(0.98);
		background: #f5f5f5;
	}

	.edit-btn-save {
		border: none;
		background: var(--accent-primary, #6366f1);
		color: white;
	}

	.edit-btn-save:active {
		transform: scale(0.98);
		opacity: 0.9;
	}

	/* Item info tappable */
	.icon-box, .item-info {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Detail Modal */
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

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.detail-sheet {
		width: 100%;
		max-width: 500px;
		background: #fdfbf7;
		border-radius: var(--radius-l) var(--radius-l) 0 0;
		padding: 0 24px calc(32px + env(safe-area-inset-bottom, 0px));
		animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.detail-handle {
		width: 40px;
		height: 4px;
		background: rgba(0, 0, 0, 0.12);
		border-radius: 2px;
		margin: 12px auto 16px;
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.detail-icon-box {
		width: 52px;
		height: 52px;
		background: #FFF0F3;
		border-radius: var(--radius-s);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		color: var(--accent-pink);
	}

	.detail-close {
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
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.detail-close:active {
		background: rgba(0, 0, 0, 0.04);
		transform: scale(0.95);
	}

	.detail-name {
		font-family: 'Poppins', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--text-dark);
		margin: 0 0 4px;
		line-height: 1.3;
		word-break: break-word;
	}

	.detail-category {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-soft);
	}

	.detail-rating {
		margin-top: 8px;
	}

	.detail-stats {
		display: flex;
		gap: 8px;
		margin: 20px 0 16px;
	}

	.detail-stat {
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

	.detail-stat-value {
		font-family: 'Poppins', sans-serif;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-dark);
	}

	.detail-stat-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
</style>
