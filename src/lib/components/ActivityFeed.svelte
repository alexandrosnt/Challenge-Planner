<script>
    import GlassCard from '$lib/components/GlassCard.svelte';

    let { entries = [] } = $props();

    /** @param {string} timestamp */
    function timeAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return then.toLocaleDateString();
    }
</script>

{#if entries.length > 0}
    <GlassCard>
        <div class="feed">
            {#each entries as entry, i (i)}
                <div class="feed-row">
                    <div class="feed-icon" class:purchase={entry.type === 'purchase'} class:usage={entry.type === 'usage'} class:declutter={entry.type === 'declutter'}>
                        <i class={entry.icon}></i>
                    </div>
                    <div class="feed-info">
                        <span class="feed-desc">{entry.description}</span>
                        <span class="feed-time">{timeAgo(entry.timestamp)}</span>
                    </div>
                </div>
            {/each}
        </div>
    </GlassCard>
{/if}

<style>
    .feed { display: flex; flex-direction: column; gap: 14px; }
    .feed-row { display: flex; align-items: center; gap: 12px; }
    .feed-icon {
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
    }
    .feed-icon.purchase { background: #FFF0F3; color: var(--accent-pink); }
    .feed-icon.usage { background: #E8F5E9; color: var(--accent-sage); }
    .feed-icon.declutter { background: #F5F5F5; color: var(--text-soft); }
    .feed-info { flex: 1; min-width: 0; }
    .feed-desc {
        display: block; font-size: 13px; font-weight: 500;
        color: var(--text-dark); white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
    }
    .feed-time { font-size: 11px; color: var(--text-soft); }
</style>
