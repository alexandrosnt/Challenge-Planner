<script lang="ts">
	let { checked, onToggle }: { checked: boolean; onToggle: () => void } = $props();
</script>

<button
	class="selectable-checkbox"
	class:checked
	onclick={(e) => { e.stopPropagation(); onToggle(); }}
	aria-label={checked ? 'Deselect' : 'Select'}
>
	{#if checked}
		<i class="ri-checkbox-fill"></i>
	{:else}
		<i class="ri-checkbox-blank-line"></i>
	{/if}
</button>

<style>
	.selectable-checkbox {
		flex-shrink: 0;
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		font-size: 22px;
		color: rgba(0, 0, 0, 0.2);
		transition: color 0.15s ease, transform 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.selectable-checkbox.checked {
		color: var(--accent-pink);
	}

	.selectable-checkbox:active {
		transform: scale(0.85);
	}
</style>
