<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let { streak } = $props();
</script>

<div class="streak-card-wrapper">
    <GlassCard style={streak.active ? "background: linear-gradient(135deg, rgba(255,240,230,0.8), rgba(255,220,200,0.8));" : ""}>
        <div class="streak-content">
            <div class="streak-icon" class:active={streak.active}>
                <i class="ri-fire-line"></i>
            </div>
            <div class="streak-count">{streak.current_count}</div>
            <div class="streak-label">{t.streak.days}</div>
            <div class="streak-category">{streak.category_name || t.streak.allCategories}</div>
            {#if streak.best_count > streak.current_count}
                <div class="streak-best">{t.streak.best}: {streak.best_count}</div>
            {/if}
        </div>
    </GlassCard>
</div>

<style>
    .streak-card-wrapper {
        min-width: 140px;
        flex-shrink: 0;
    }
    .streak-content {
        text-align: center;
    }
    .streak-icon {
        width: 40px; height: 40px; margin: 0 auto 8px;
        background: #f5f5f5; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; color: #ccc;
    }
    .streak-icon.active {
        background: linear-gradient(135deg, #FF9A9E, #FF6B81);
        color: white;
        box-shadow: 0 4px 15px rgba(255,107,129,0.3);
    }
    .streak-count {
        font-size: 32px; font-weight: 700; color: var(--text-dark);
        line-height: 1;
    }
    .streak-label {
        font-size: 11px; font-weight: 600; color: var(--text-soft);
        text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
    }
    .streak-category {
        font-size: 12px; color: var(--text-soft); font-weight: 500;
    }
    .streak-best {
        font-size: 11px; color: var(--accent-pink); font-weight: 600; margin-top: 4px;
    }
</style>
