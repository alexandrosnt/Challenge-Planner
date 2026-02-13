<script lang="ts">
	let {
		rating,
		onRate,
		size = 'sm'
	}: {
		rating: number;
		onRate?: (rating: number) => void;
		size?: 'sm' | 'md';
	} = $props();

	const interactive = $derived(!!onRate);
	const fontSize = $derived(size === 'sm' ? '14px' : '20px');
	const gap = $derived(size === 'sm' ? '1px' : '2px');
</script>

{#if rating > 0 || interactive}
	<div
		class="star-rating"
		class:interactive
		style:font-size={fontSize}
		style:gap={gap}
		role={interactive ? 'group' : 'img'}
		aria-label={`Rating: ${rating} out of 5 stars`}
	>
		{#each { length: 5 } as _, i (i)}
			{#if interactive}
				<button
					type="button"
					class="star-btn"
					onclick={() => onRate?.(i + 1)}
					aria-label={`Rate ${i + 1} star${i + 1 > 1 ? 's' : ''}`}
				>
					<i
						class={i < rating ? 'ri-star-fill filled' : 'ri-star-line empty'}
					></i>
				</button>
			{:else}
				<i
					class={i < rating ? 'ri-star-fill filled' : 'ri-star-line empty'}
				></i>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.star-rating {
		display: inline-flex;
		align-items: center;
	}

	.star-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 28px;
		min-width: 28px;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		font-size: inherit;
	}

	.star-btn:active {
		transform: scale(1.2);
	}

	.filled {
		color: var(--accent-pink, #FF6B81);
	}

	.empty {
		color: rgba(0, 0, 0, 0.15);
	}
</style>
