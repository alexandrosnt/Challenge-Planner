<script lang="ts">
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressBar from '$lib/components/ProgressBar.svelte';
    import { getBudgetWithSpending, getPurchases, getTotalSpentThisMonth, type Budget, type Purchase } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let budgets = $state<Budget[]>([]);
    let purchases = $state<Purchase[]>([]);
    let totalSpent = $state(0);
    let loading = $state(true);
    let currentMonth = $state(new Date().toISOString().slice(0, 7));

    let totalLimit = $derived(budgets.reduce((sum, b) => sum + b.monthly_limit, 0));
    let budgetPct = $derived(totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0);
    let remaining = $derived(Math.max(0, totalLimit - totalSpent));

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            const [b, p, spent] = await Promise.all([
                getBudgetWithSpending(userId, currentMonth),
                getPurchases(userId, undefined, currentMonth),
                getTotalSpentThisMonth(userId),
            ]);
            budgets = b;
            purchases = p;
            totalSpent = spent;
        } catch (e) {
            console.error('Failed to load budget data:', e);
        } finally {
            loading = false;
        }
    }

    function formatCurrency(amount: number): string {
        return amount.toFixed(2) + '\u20AC';
    }

    onMount(() => {
        loadData();
    });

    export function refresh() {
        loadData();
    }
</script>

<header class="page-header">
    <h1 class="page-title">{t.budgetPage.title}</h1>
</header>

<main>
    {#if loading}
        <!-- Skeleton -->
        <GlassCard>
            <div class="shimmer" style="width: 100%; height: 80px; border-radius: 12px;"></div>
        </GlassCard>
        {#each Array(2) as _}
            <GlassCard>
                <div class="shimmer" style="width: 100%; height: 60px; border-radius: 8px;"></div>
            </GlassCard>
        {/each}
    {:else}
        <!-- Overview Card -->
        {#if budgets.length > 0}
            <GlassCard>
                <div class="overview-card">
                    <div class="overview-row">
                        <div class="overview-stat">
                            <span class="overview-label">{t.budgetPage.spent}</span>
                            <span class="overview-value spent">{formatCurrency(totalSpent)}</span>
                        </div>
                        <div class="overview-stat">
                            <span class="overview-label">{t.budgetPage.remaining}</span>
                            <span class="overview-value remaining">{formatCurrency(remaining)}</span>
                        </div>
                    </div>
                    <div class="overview-bar">
                        <ProgressBar
                            value={Math.min(budgetPct, 100)}
                            height="8px"
                        />
                        <span class="bar-label">{budgetPct}% {t.insights.budgetUsed}</span>
                    </div>
                </div>
            </GlassCard>
        {/if}

        <!-- Budget Categories -->
        {#if budgets.length > 0}
            <SectionTitle title={t.insights.budgetManagement} actionText="{budgets.length} {t.common.items}" />
            {#each budgets as budget (budget.id)}
                {@const actualSpent = budget.actual_spent ?? budget.spent}
                {@const pct = budget.monthly_limit > 0 ? Math.round((actualSpent / budget.monthly_limit) * 100) : 0}
                {@const left = Math.max(0, budget.monthly_limit - actualSpent)}
                <GlassCard>
                    <div class="budget-row">
                        <div class="budget-header">
                            <div class="budget-cat">
                                <i class="{budget.category_icon} budget-icon"></i>
                                <span class="budget-name">{budget.category_name}</span>
                            </div>
                            <span class="budget-limit">{formatCurrency(budget.monthly_limit)}</span>
                        </div>
                        <ProgressBar
                            value={Math.min(pct, 100)}
                            height="6px"
                        />
                        <div class="budget-footer">
                            <span class="budget-spent">{formatCurrency(actualSpent)} {t.budgetPage.spent}</span>
                            <span class="budget-remaining">{formatCurrency(left)} {t.budgetPage.remaining}</span>
                        </div>
                        {#if budget.carryover_amount > 0}
                            <span class="carryover-badge">+{formatCurrency(budget.carryover_amount)} {t.insights.carriedOver}</span>
                        {/if}
                    </div>
                </GlassCard>
            {/each}
        {:else}
            <GlassCard>
                <div class="empty-state">
                    <i class="ri-wallet-3-line empty-icon"></i>
                    <p class="empty-text">{t.budgetPage.noBudgets}</p>
                </div>
            </GlassCard>
        {/if}

        <!-- Recent Purchases -->
        {#if purchases.length > 0}
            <SectionTitle title={t.budgetPage.totalSpending} actionText={String(purchases.length)} />
            <GlassCard>
                {#each purchases.slice(0, 10) as purchase (purchase.id)}
                    <div class="purchase-row">
                        <div class="purchase-info">
                            <span class="purchase-name">{purchase.name}</span>
                            <span class="purchase-meta">{purchase.category_name} &middot; {purchase.purchase_date}</span>
                        </div>
                        <span class="purchase-amount">-{formatCurrency(purchase.amount)}</span>
                    </div>
                {/each}
            </GlassCard>
        {/if}

    {/if}
</main>

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px 24px;
    }
    .page-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: -0.3px;
    }
    .overview-card {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .overview-row {
        display: flex;
        justify-content: space-between;
    }
    .overview-stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .overview-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .overview-value {
        font-size: 24px;
        font-weight: 700;
    }
    .overview-value.spent { color: var(--accent-pink); }
    .overview-value.remaining { color: var(--accent-sage); }
    .overview-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .bar-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-soft);
        text-align: right;
    }
    .budget-row {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .budget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .budget-cat {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .budget-icon {
        font-size: 20px;
        color: var(--accent-pink);
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(233, 30, 99, 0.08);
    }
    .budget-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .budget-limit {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-soft);
    }
    .budget-footer {
        display: flex;
        justify-content: space-between;
    }
    .budget-spent {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-soft);
    }
    .budget-remaining {
        font-size: 12px;
        font-weight: 600;
        color: var(--accent-sage);
    }
    .carryover-badge {
        font-size: 11px;
        font-weight: 600;
        color: #4CAF50;
        background: #E8F5E9;
        padding: 4px 10px;
        border-radius: 10px;
        align-self: flex-start;
    }
    .purchase-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
    }
    .purchase-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .purchase-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .purchase-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .purchase-meta {
        font-size: 11px;
        color: var(--text-soft);
    }
    .purchase-amount {
        font-size: 14px;
        font-weight: 700;
        color: var(--accent-pink);
    }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 0;
        gap: 12px;
    }
    .empty-icon {
        font-size: 48px;
        color: var(--accent-sage);
    }
    .empty-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-soft);
        text-align: center;
    }
    .shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
        display: inline-block;
    }
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
