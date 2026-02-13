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
		onRemove,
		onEdit,
		selectMode = false,
		selected = false,
		onSelect,
	}: {
		item: PanItem;
		onMarkEmptied?: (id: number) => void;
		onRemove?: (id: number) => void;
		onEdit?: (id: number) => void;
		selectMode?: boolean;
		selected?: boolean;
		onSelect?: (id: number) => void;
	} = $props();

	let percentage = $derived(
		item.quantity > 0 ? Math.round((item.emptied / item.quantity) * 100) : 0
	);
	let isComplete = $derived(item.emptied >= item.quantity);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pan-item-card"
	class:selected-card={selectMode && selected}
	onclick={selectMode ? () => onSelect?.(item.id) : undefined}
>
	{#if selectMode}
		<div class="select-overlay">
			<SelectableCheckbox checked={selected} onToggle={() => onSelect?.(item.id)} />
		</div>
	{:else}
		{#if onEdit}
			<button class="edit-btn" onclick={() => onEdit(item.id)} aria-label={t.panProject.editQuantity}>
				<i class="ri-pencil-line"></i>
			</button>
		{/if}
		{#if onRemove}
			<button class="remove-btn" onclick={() => onRemove(item.id)} aria-label={t.panProject.removeItem}>
				<i class="ri-close-line"></i>
			</button>
		{/if}
	{/if}

	<div class="card-header">
		<div class="icon-box">
			<i class={item.category_icon}></i>
		</div>
		<div class="item-info">
			<h4 class="item-name">{item.item_name}</h4>
			<span class="category-name">{item.category_name}</span>
			{#if item.rating > 0}
				<StarRating rating={item.rating} />
			{/if}
		</div>
	</div>

	<div class="progress-section">
		<div class="progress-text">
			<span class="progress-label">{t.panProject.progress}</span>
			<span class="progress-count">{item.emptied} {t.panProject.of} {item.quantity} {t.panProject.emptied}</span>
		</div>
		<ProgressBar value={percentage} height="8px" />
	</div>

	{#if onMarkEmptied}
		<button
			class="mark-emptied-btn"
			class:complete={isComplete}
			disabled={isComplete}
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

<style>
	.pan-item-card {
		position: relative;
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-m);
		box-shadow: var(--glass-shadow);
		padding: 20px;
		margin-bottom: 16px;
		transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.pan-item-card:active {
		transform: scale(0.98);
	}

	.pan-item-card.selected-card {
		border-color: var(--accent-pink);
		box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.15);
	}

	.select-overlay {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 5;
	}

	.edit-btn {
		position: absolute;
		top: 10px;
		right: 48px;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-soft);
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: 0.2s;
		padding: 0;
		z-index: 5;
		-webkit-tap-highlight-color: transparent;
	}

	.edit-btn:active {
		background: rgba(99, 102, 241, 0.15);
		color: var(--accent-primary, #6366f1);
		transform: scale(0.9);
	}

	.remove-btn {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-soft);
		font-size: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: 0.2s;
		padding: 0;
		z-index: 5;
		-webkit-tap-highlight-color: transparent;
	}

	.remove-btn:active {
		background: rgba(255, 107, 129, 0.15);
		color: var(--accent-pink);
		transform: scale(0.9);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 16px;
		padding-right: 80px;
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

	.mark-emptied-btn {
		width: 100%;
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
</style>
