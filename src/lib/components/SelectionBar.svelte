<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';

	let {
		selectedCount,
		totalCount,
		onSelectAll,
		onDeselectAll,
		onDeleteSelected,
		deleting = false,
	}: {
		selectedCount: number;
		totalCount: number;
		onSelectAll: () => void;
		onDeselectAll: () => void;
		onDeleteSelected: () => void;
		deleting?: boolean;
	} = $props();

	let allSelected = $derived(selectedCount > 0 && selectedCount === totalCount);
</script>

{#if selectedCount > 0}
	<div class="selection-bar">
		<span class="selection-count">{selectedCount} {t.common.selectedCount}</span>
		<div class="selection-actions">
			<button class="bar-btn" onclick={allSelected ? onDeselectAll : onSelectAll}>
				{allSelected ? t.common.deselectAll : t.common.selectAll}
			</button>
			<button class="bar-btn delete" onclick={onDeleteSelected} disabled={deleting}>
				{#if deleting}
					<i class="ri-loader-4-line spin"></i>
				{:else}
					<i class="ri-delete-bin-line"></i>
				{/if}
				{t.common.deleteSelected}
			</button>
		</div>
	</div>
{/if}

<style>
	.selection-bar {
		position: fixed;
		bottom: 95px;
		left: 12px;
		right: 12px;
		z-index: 99;
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		padding: 12px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.selection-count {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-dark);
		white-space: nowrap;
	}

	.selection-actions {
		display: flex;
		gap: 8px;
	}

	.bar-btn {
		padding: 8px 14px;
		border-radius: 50px;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		font-family: 'Poppins', sans-serif;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-soft);
		cursor: pointer;
		transition: 0.2s;
		display: flex;
		align-items: center;
		gap: 5px;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
	}

	.bar-btn:active {
		transform: scale(0.95);
	}

	.bar-btn.delete {
		background: var(--accent-pink);
		color: white;
		border-color: var(--accent-pink);
	}

	.bar-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
