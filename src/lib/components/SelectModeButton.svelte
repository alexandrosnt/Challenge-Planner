<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';

	let { active, onToggle }: { active: boolean; onToggle: () => void } = $props();
</script>

<button class="select-mode-btn" class:active onclick={onToggle} aria-label={t.common.select}>
	{#if active}
		<i class="ri-close-line"></i>
	{:else}
		<i class="ri-checkbox-multiple-line"></i>
	{/if}
</button>

<style>
	.select-mode-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		color: var(--text-soft);
		font-size: 18px;
		cursor: pointer;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
	}

	.select-mode-btn.active {
		background: var(--accent-pink);
		color: white;
		border-color: var(--accent-pink);
	}

	.select-mode-btn:active {
		transform: scale(0.9);
	}
</style>
