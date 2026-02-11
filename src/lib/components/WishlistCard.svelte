<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let { item, onPurchase, onRemove } = $props();

    let isReady = $derived((item.days_remaining ?? 0) === 0);
    let waitProgress = $derived.by(() => {
        if (!item.wait_until || !item.added_at) return 100;
        const total = new Date(item.wait_until).getTime() - new Date(item.added_at).getTime();
        const elapsed = new Date().getTime() - new Date(item.added_at).getTime();
        return Math.min(100, Math.round((elapsed / total) * 100));
    });
</script>

<GlassCard>
    <div class="wishlist-content">
        <div class="wishlist-header">
            <div class="wishlist-info">
                <h3 class="wishlist-name">{item.name}</h3>
                {#if item.category_name}
                    <span class="wishlist-category">{item.category_name}</span>
                {/if}
                {#if item.estimated_price}
                    <span class="wishlist-price">{item.estimated_price}€</span>
                {/if}
            </div>
            <ProgressRing value={waitProgress} size={48} strokeWidth={4} color={isReady ? 'var(--accent-sage)' : 'var(--accent-pink)'} />
        </div>

        {#if isReady}
            <div class="ready-badge">{t.wishlist.readyToBuy}</div>
        {:else}
            <div class="countdown">
                <i class="ri-time-line"></i>
                {item.days_remaining} {t.wishlist.daysRemaining}
            </div>
        {/if}

        <div class="wishlist-actions">
            {#if isReady && onPurchase}
                <button class="action-btn purchase" onclick={() => onPurchase(item)}>
                    <i class="ri-shopping-bag-3-line"></i> {t.wishlist.purchase}
                </button>
            {/if}
            {#if onRemove}
                <button class="action-btn remove" onclick={() => onRemove(item)}>
                    <i class="ri-close-line"></i> {t.wishlist.remove}
                </button>
            {/if}
        </div>
    </div>
</GlassCard>

<style>
    .wishlist-content { display: contents; }
    .wishlist-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .wishlist-info { flex: 1; }
    .wishlist-name { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .wishlist-category { font-size: 11px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.5px; display: block; }
    .wishlist-price { font-size: 13px; font-weight: 600; color: var(--accent-pink); display: block; margin-top: 4px; }

    .ready-badge {
        margin-top: 12px; padding: 8px; text-align: center;
        background: #E8F5E9; color: var(--accent-sage);
        border-radius: 50px; font-size: 13px; font-weight: 700;
    }
    .countdown {
        margin-top: 12px; font-size: 13px; color: var(--text-soft);
        font-weight: 500; display: flex; align-items: center; gap: 6px;
    }
    .countdown i { color: var(--accent-pink); }

    .wishlist-actions { display: flex; gap: 10px; margin-top: 14px; }
    .action-btn {
        flex: 1; padding: 10px; border-radius: 50px;
        font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600;
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; gap: 6px; transition: 0.2s;
    }
    .action-btn:active { transform: scale(0.98); }
    .action-btn.purchase {
        background: var(--primary-gradient); color: white; border: none;
        box-shadow: 0 4px 15px rgba(255,107,129,0.3);
    }
    .action-btn.remove {
        background: white; color: var(--text-soft);
        border: 1px solid rgba(0,0,0,0.06);
    }
</style>
