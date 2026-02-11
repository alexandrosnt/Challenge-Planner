<script>
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import ProgressBar from '$lib/components/ProgressBar.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import SavingsCounter from '$lib/components/SavingsCounter.svelte';
    import SpendingChart from '$lib/components/SpendingChart.svelte';
    import DaysSinceCard from '$lib/components/DaysSinceCard.svelte';
    import {
        getComputedStats,
        getBudgetWithSpending,
        getCategories,
        getAllLastPurchaseDates
    } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { dragscroll } from '$lib/actions/dragscroll';

    let auth = getAuthState();

    /** @type {import('$lib/db/queries').ComputedStats | null} */
    let stats = $state(null);
    /** @type {import('$lib/db/queries').Budget[]} */
    let budgets = $state([]);
    /** @type {import('$lib/db/queries').Category[]} */
    let categories = $state([]);
    /** @type {{category: import('$lib/db/queries').Category, lastPurchaseDate: string | null}[]} */
    let daysSinceData = $state([]);

    onMount(async () => {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        const [s, b, c, dates] = await Promise.all([
            getComputedStats(userId),
            getBudgetWithSpending(userId),
            getCategories(),
            getAllLastPurchaseDates(userId)
        ]);
        stats = s;
        budgets = b;
        categories = c;
        daysSinceData = c.map(cat => ({ category: cat, lastPurchaseDate: dates[cat.id] ?? null }));
    });

    let totalBudgetSpent = $derived(budgets.reduce((sum, b) => sum + (b.actual_spent ?? b.spent), 0));
    let totalBudgetLimit = $derived(budgets.reduce((sum, b) => sum + b.monthly_limit, 0));
    let totalBudgetPct = $derived(totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0);
</script>

<header style="padding: 20px 24px;">
    <div>
        <p style="font-size: 14px; color: var(--text-soft); font-weight: 500;">Overview</p>
        <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Insights</h1>
    </div>
</header>

<main>
    {#if stats}
        <!-- Savings Counter Hero -->
        <SavingsCounter totalSaved={stats.total_saved} />

        <!-- This Month Overview -->
        <SectionTitle title="This Month" actionText="" />
        <GlassCard>
            <div class="stat-grid">
                <div class="stat-box">
                    <ProgressRing value={stats.budget_percentage} size={48} strokeWidth={4} />
                    <p>Budget Used</p>
                </div>
                <div class="stat-box">
                    <div class="stat-number">{stats.active_items}</div>
                    <p>Active Items</p>
                </div>
                <div class="stat-box">
                    <div class="stat-number sage">{stats.used_up_items}</div>
                    <p>Used Up</p>
                </div>
                <div class="stat-box">
                    <div class="stat-number">{stats.total_usage_count}</div>
                    <p>Total Uses</p>
                </div>
            </div>
        </GlassCard>

        <!-- Spending Chart -->
        <SpendingChart {budgets} />

        <!-- Days Since Last Purchase -->
        {#if daysSinceData.length > 0}
            <SectionTitle title="Days Since Purchase" actionText="" />
            <div class="days-scroll" use:dragscroll>
                {#each daysSinceData as dsd (dsd.category.id)}
                    <DaysSinceCard category={dsd.category} lastPurchaseDate={dsd.lastPurchaseDate} />
                {/each}
            </div>
        {/if}

        <!-- Budget Management -->
        {#if budgets.length > 0}
            <SectionTitle title="Budget Management" actionText="" />
            {#each budgets as budget (budget.id)}
                <GlassCard>
                    <div class="budget-row">
                        <div class="budget-info">
                            <div class="budget-cat">
                                {#if budget.category_icon}
                                    <i class={budget.category_icon}></i>
                                {/if}
                                <span class="budget-name">{budget.category_name ?? 'Category'}</span>
                            </div>
                            <span class="budget-amount">
                                {Math.round(budget.actual_spent ?? budget.spent)}€ / {budget.monthly_limit}€
                            </span>
                        </div>
                        <span class="budget-pct">
                            {Math.round(((budget.actual_spent ?? budget.spent) / budget.monthly_limit) * 100)}%
                        </span>
                    </div>
                    <ProgressBar value={Math.round(((budget.actual_spent ?? budget.spent) / budget.monthly_limit) * 100)} />
                    {#if budget.carryover && budget.carryover_amount > 0}
                        <div class="carryover-note">
                            <i class="ri-arrow-right-line"></i>
                            +{budget.carryover_amount.toFixed(2)}€ carried over
                        </div>
                    {/if}
                </GlassCard>
            {/each}

            <!-- Total Spending Summary -->
            {#if totalBudgetLimit > 0}
                <GlassCard>
                    <div class="budget-row">
                        <div class="budget-info">
                            <span class="budget-name" style="font-weight: 700;">Total Spending</span>
                        </div>
                        <span class="total-amount">{Math.round(totalBudgetSpent)}€ / {totalBudgetLimit}€</span>
                    </div>
                    <ProgressBar value={totalBudgetPct} />
                </GlassCard>
            {/if}
        {/if}
    {:else}
        <!-- Skeleton Preloader -->
        <GlassCard>
            <div class="shimmer" style="width: 80px; height: 36px; margin: 0 auto 8px;"></div>
            <div class="shimmer" style="width: 120px; height: 12px; margin: 0 auto;"></div>
        </GlassCard>
        <div class="shimmer" style="width: 90px; height: 18px; margin-bottom: 15px;"></div>
        <GlassCard>
            <div class="stat-grid">
                {#each Array(4) as _}
                    <div class="stat-box">
                        <div class="shimmer" style="width: 48px; height: 48px; border-radius: 50%; margin: 0 auto;"></div>
                        <div class="shimmer" style="width: 60px; height: 10px; margin: 6px auto 0;"></div>
                    </div>
                {/each}
            </div>
        </GlassCard>
        <GlassCard>
            <div class="shimmer" style="width: 140px; height: 16px; margin-bottom: 20px;"></div>
            <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 140px;">
                {#each Array(4) as _}
                    <div class="shimmer" style="width: 28px; height: {40 + Math.random() * 80}px; border-radius: 6px 6px 0 0;"></div>
                {/each}
            </div>
        </GlassCard>
    {/if}
</main>

<style>
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .stat-box { text-align: center; }
    .stat-box p {
        font-size: 11px; color: var(--text-soft); font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;
    }
    .stat-number { font-size: 28px; font-weight: 700; color: var(--text-dark); }
    .stat-number.sage { color: var(--accent-sage); }

    .days-scroll {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 10px;
        margin: 0 -24px 20px -24px;
        padding: 0 24px 10px 24px;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .days-scroll::-webkit-scrollbar { display: none; }

    .budget-row {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 8px;
    }
    .budget-info { display: flex; flex-direction: column; gap: 2px; }
    .budget-cat { display: flex; align-items: center; gap: 8px; }
    .budget-cat i { color: var(--accent-pink); font-size: 18px; }
    .budget-name { font-size: 14px; font-weight: 600; }
    .budget-amount { font-size: 12px; color: var(--text-soft); }
    .budget-pct { font-size: 14px; font-weight: 700; color: var(--accent-pink); }
    .total-amount { color: var(--accent-pink); font-weight: 700; font-size: 14px; }
    .carryover-note {
        margin-top: 8px; font-size: 11px; color: var(--accent-sage);
        font-weight: 600; display: flex; align-items: center; gap: 4px;
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
