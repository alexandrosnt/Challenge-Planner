<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let { emptyItems = 0, monthlySaved = 0, noBuyDays = 0 } = $props();
</script>

<GlassCard>
    <div class="hero-stats">
        <div class="stat-item">
            <h3>{emptyItems}</h3>
            <p>{t.hero.usedUp}</p>
        </div>
        <div class="divider"></div>
        <div class="stat-item">
            <h3>{monthlySaved}€</h3>
            <p>{t.hero.saved}</p>
        </div>
        <div class="divider"></div>
        <div class="stat-item">
            <h3 class="sage">{noBuyDays}</h3>
            <p>{t.hero.noBuyDays}</p>
        </div>
    </div>
</GlassCard>

<style>
    .hero-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .stat-item h3 {
        font-size: 28px;
        font-weight: 700;
        color: var(--text-dark);
        margin-bottom: -5px;
    }
    .stat-item p {
        font-size: 12px;
        color: var(--text-soft);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .divider {
        width: 1px;
        height: 40px;
        background: rgba(0, 0, 0, 0.05);
    }
    .sage {
        color: var(--accent-sage) !important;
    }
</style>
