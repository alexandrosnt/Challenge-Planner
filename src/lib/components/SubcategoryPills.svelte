<script>
	import { dragscroll } from '$lib/actions/dragscroll';
	import { t } from '$lib/i18n/index.svelte';
	let { subcategories, selected = 0, onSelect } = $props();
</script>

<div class="subcategory-scroll" use:dragscroll>
	<button
		class="sub-pill"
		class:active={selected === 0}
		onclick={() => onSelect(0)}
	>
		<span>{t.common.all}</span>
	</button>
	{#each subcategories as sub (sub.id)}
		<button
			class="sub-pill"
			class:active={selected === sub.id}
			onclick={() => onSelect(sub.id)}
		>
			{#if sub.icon}
				<i class={sub.icon}></i>
			{/if}
			<span>{sub.name}</span>
		</button>
	{/each}
</div>

<style>
	.subcategory-scroll {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding-bottom: 8px;
		margin: 0 -24px 16px -24px;
		padding: 0 24px 8px 24px;
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.subcategory-scroll::-webkit-scrollbar {
		display: none;
	}

	.sub-pill {
		background: white;
		padding: 8px 16px;
		border-radius: var(--radius-s, 50px);
		display: flex;
		align-items: center;
		gap: 6px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
		white-space: nowrap;
		border: 1px solid rgba(0, 0, 0, 0.02);
		cursor: pointer;
		font-family: inherit;
		transition: background 0.2s, color 0.2s;
		flex-shrink: 0;
	}
	.sub-pill:active {
		transform: scale(0.96);
	}
	.sub-pill i {
		color: var(--accent-pink);
		font-size: 14px;
	}
	.sub-pill span {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-dark);
	}

	.sub-pill.active {
		background: var(--accent-pink);
		border-color: var(--accent-pink);
	}
	.sub-pill.active i {
		color: white;
	}
	.sub-pill.active span {
		color: white;
	}
</style>
