<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let { budgets = [] } = $props();

    let maxValue = $derived(
        Math.max(...budgets.map(b => Math.max(b.actual_spent || b.spent, b.monthly_limit)), 1)
    );

    /** @param {number} value */
    function barHeight(value) {
        return Math.max(4, (value / maxValue) * 120);
    }
</script>

<GlassCard>
    <h3 class="chart-title">{t.spending.title}</h3>
    {#if budgets.length > 0}
        <div class="chart">
            {#each budgets as budget (budget.id)}
                <div class="bar-group">
                    <div class="bar-container">
                        <div class="budget-line" style:bottom="{barHeight(budget.monthly_limit)}px"></div>
                        <div
                            class="bar"
                            class:over={((budget.actual_spent ?? budget.spent) > budget.monthly_limit)}
                            style:height="{barHeight(budget.actual_spent ?? budget.spent)}px"
                        ></div>
                    </div>
                    <span class="bar-label">{budget.category_name?.slice(0, 6) ?? '?'}</span>
                    <span class="bar-amount">{Math.round(budget.actual_spent ?? budget.spent)}€</span>
                </div>
            {/each}
        </div>
        <div class="legend">
            <span class="legend-item"><span class="legend-bar"></span> {t.spending.spent}</span>
            <span class="legend-item"><span class="legend-line"></span> {t.spending.limit}</span>
        </div>
    {:else}
        <p class="empty-text">{t.spending.emptyState}</p>
    {/if}
</GlassCard>

<style>
    .chart-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
    .chart {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        height: 160px;
        padding-top: 20px;
    }
    .bar-group { text-align: center; flex: 1; }
    .bar-container {
        height: 130px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        position: relative;
    }
    .bar {
        width: 28px;
        background: var(--primary-gradient);
        border-radius: 6px 6px 0 0;
        transition: height 0.5s ease;
        box-shadow: 0 0 8px rgba(255, 107, 129, 0.2);
    }
    .bar.over {
        background: linear-gradient(135deg, #ff4444, #ff6666);
        box-shadow: 0 0 8px rgba(255, 68, 68, 0.3);
    }
    .budget-line {
        position: absolute;
        left: 0; right: 0;
        height: 2px;
        background: var(--accent-sage);
        opacity: 0.6;
    }
    .bar-label {
        display: block;
        font-size: 10px; font-weight: 600; color: var(--text-soft);
        margin-top: 8px; text-transform: uppercase;
    }
    .bar-amount {
        display: block;
        font-size: 11px; font-weight: 700; color: var(--text-dark);
    }
    .legend {
        display: flex; justify-content: center; gap: 20px;
        margin-top: 16px; font-size: 11px; color: var(--text-soft);
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-bar {
        width: 12px; height: 8px; border-radius: 2px;
        background: var(--primary-gradient);
    }
    .legend-line {
        width: 12px; height: 2px;
        background: var(--accent-sage);
    }
    .empty-text { text-align: center; color: var(--text-soft); font-size: 14px; }
</style>
