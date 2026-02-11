<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let { category, lastPurchaseDate } = $props();

    let daysSince = $derived.by(() => {
        if (!lastPurchaseDate) return null;
        const diff = new Date().getTime() - new Date(lastPurchaseDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    });

    let colorClass = $derived.by(() => {
        if (daysSince === null) return 'none';
        if (daysSince >= 30) return 'green';
        if (daysSince >= 15) return 'yellow';
        return 'pink';
    });
</script>

<div class="days-card-wrapper">
    <GlassCard>
        <div class="days-content">
            <div class="days-icon">
                <i class={category.icon}></i>
            </div>
            {#if daysSince !== null}
                <div class="days-count" class:green={colorClass === 'green'} class:yellow={colorClass === 'yellow'} class:pink={colorClass === 'pink'}>
                    {daysSince}
                </div>
                <div class="days-label">{t.daysSince.daysSince}</div>
            {:else}
                <div class="days-count none">--</div>
                <div class="days-label">{t.daysSince.noPurchases}</div>
            {/if}
            <div class="days-category">{category.name}</div>
        </div>
    </GlassCard>
</div>

<style>
    .days-card-wrapper {
        min-width: 130px;
        flex-shrink: 0;
    }
    .days-content { text-align: center; }
    .days-icon {
        width: 36px; height: 36px; margin: 0 auto 8px;
        background: #FFF0F3; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; color: var(--accent-pink);
    }
    .days-count {
        font-size: 28px; font-weight: 700; line-height: 1;
    }
    .days-count.green { color: var(--accent-sage); }
    .days-count.yellow { color: #E8A838; }
    .days-count.pink { color: var(--accent-pink); }
    .days-count.none { color: #ccc; }
    .days-label {
        font-size: 10px; font-weight: 600; color: var(--text-soft);
        text-transform: uppercase; letter-spacing: 0.5px;
    }
    .days-category {
        font-size: 12px; color: var(--text-soft); margin-top: 4px; font-weight: 500;
    }
</style>
