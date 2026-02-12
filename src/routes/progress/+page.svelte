<script lang="ts">
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import ProgressBar from '$lib/components/ProgressBar.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import { loadProgressData, getPanProjectStats, type ProgressData, type PanProjectStats } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { goto } from '$app/navigation';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let data = $state<ProgressData | null>(null);
    let panStats = $state<PanProjectStats | null>(null);

    let usableItems = $derived(data ? data.active_items + data.used_up_items : 0);
    let completionRate = $derived(
        usableItems > 0
            ? Math.round((data!.used_up_items / usableItems) * 100)
            : 0
    );

    let panRate = $derived(
        panStats && panStats.total > 0
            ? Math.round((panStats.emptied / panStats.total) * 100)
            : 0
    );

    let achievementRate = $derived(
        data && data.achievements_total > 0
            ? Math.round((data.achievements_unlocked / data.achievements_total) * 100)
            : 0
    );

    onMount(async () => {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            [data, panStats] = await Promise.all([
                loadProgressData(userId),
                getPanProjectStats(userId)
            ]);
        } catch (e) {
            console.error('Failed to load progress data:', e);
        }
    });
</script>

<!-- Header -->
<header class="page-header">
    <h1 class="page-title">{t.progress.title}</h1>
</header>

<main>
    {#if data}
        <!-- Hero Ring -->
        <div class="hero-ring">
            <ProgressRing value={completionRate} size={120} strokeWidth={7} />
            <p class="hero-label">
                {data.used_up_items} {t.progress.of} {usableItems} {t.progress.productsFinished}
            </p>
        </div>

        <!-- Stats Row -->
        <GlassCard>
            <div class="stats-grid">
                <div class="stat-block">
                    <i class="ri-check-double-line stat-icon sage"></i>
                    <span class="stat-value">{data.used_up_items}</span>
                    <span class="stat-label">{t.progress.usedUp}</span>
                </div>
                <div class="stat-block">
                    <i class="ri-play-circle-line stat-icon pink"></i>
                    <span class="stat-value">{data.active_items}</span>
                    <span class="stat-label">{t.progress.active}</span>
                </div>
                <div class="stat-block">
                    <i class="ri-delete-bin-line stat-icon pink"></i>
                    <span class="stat-value">{data.decluttered_items}</span>
                    <span class="stat-label">{t.progress.decluttered}</span>
                </div>
                <div class="stat-block">
                    <i class="ri-refresh-line stat-icon sage"></i>
                    <span class="stat-value">{data.total_usage_count}</span>
                    <span class="stat-label">{t.progress.totalUses}</span>
                </div>
            </div>
        </GlassCard>

        <!-- Declutter Summary -->
        {#if data.declutter.donated + data.declutter.sold + data.declutter.gifted + data.declutter.trashed > 0}
            <SectionTitle title={t.progress.declutterSummary} actionText={t.common.viewAll} onAction={() => goto('/declutter')} />
            <GlassCard>
                <div class="declutter-grid">
                    <div class="declutter-item">
                        <i class="ri-heart-line declutter-icon donated"></i>
                        <span class="declutter-value">{data.declutter.donated}</span>
                        <span class="declutter-label">{t.progress.donated}</span>
                    </div>
                    <div class="declutter-item">
                        <i class="ri-money-dollar-circle-line declutter-icon sold"></i>
                        <span class="declutter-value">{data.declutter.sold}</span>
                        <span class="declutter-label">{t.progress.sold}</span>
                    </div>
                    <div class="declutter-item">
                        <i class="ri-gift-line declutter-icon gifted"></i>
                        <span class="declutter-value">{data.declutter.gifted}</span>
                        <span class="declutter-label">{t.progress.gifted}</span>
                    </div>
                    <div class="declutter-item">
                        <i class="ri-delete-bin-line declutter-icon trashed"></i>
                        <span class="declutter-value">{data.declutter.trashed}</span>
                        <span class="declutter-label">{t.progress.trashed}</span>
                    </div>
                </div>
                {#if data.declutter.total_recovered > 0}
                    <div class="recovered-banner">
                        <i class="ri-coins-line"></i>
                        <span>{data.declutter.total_recovered.toFixed(2)}€ {t.progress.recoveredFromSold}</span>
                    </div>
                {/if}
            </GlassCard>
        {/if}

        <!-- Category Progress -->
        {#if data.category_progress.length > 0}
            <SectionTitle title={t.progress.byCategory} actionText="" />
            <GlassCard>
                {#each data.category_progress as cat (cat.category_id)}
                    <div class="category-row">
                        <div class="category-info">
                            <i class="{cat.category_icon} category-icon"></i>
                            <span class="category-name">{cat.category_name}</span>
                        </div>
                        <div class="category-bar">
                            <ProgressBar
                                value={(cat.used_up + cat.active) > 0 ? Math.round((cat.used_up / (cat.used_up + cat.active)) * 100) : 0}
                                height="6px"
                            />
                        </div>
                        <span class="category-count">{cat.used_up}/{cat.used_up + cat.active}</span>
                        {#if cat.decluttered > 0}
                            <span class="category-declutter" title="Decluttered">
                                <i class="ri-delete-bin-line"></i>{cat.decluttered}
                            </span>
                        {/if}
                    </div>
                {/each}
            </GlassCard>
        {/if}

        <!-- Pan Project & Achievements -->
        <SectionTitle title={t.progress.milestones} actionText="" />
        <div class="milestones-row">
            <GlassCard style="flex: 1; text-align: center;">
                <ProgressRing
                    value={panRate}
                    size={64}
                    strokeWidth={5}
                    color="var(--accent-pink)"
                />
                <p class="milestone-value">{panStats?.emptied ?? 0}/{panStats?.total ?? 0}</p>
                <p class="milestone-label">{t.panProject.title}</p>
            </GlassCard>
            <GlassCard style="flex: 1; text-align: center;">
                <ProgressRing
                    value={achievementRate}
                    size={64}
                    strokeWidth={5}
                    color="var(--accent-sage)"
                />
                <p class="milestone-value">{data.achievements_unlocked}/{data.achievements_total}</p>
                <p class="milestone-label">{t.progress.achievements}</p>
            </GlassCard>
        </div>

        <!-- Streak Highlight -->
        <GlassCard style="background: linear-gradient(135deg, #FFF3E0, #FFE0B2); border: none;">
            <div class="streak-card">
                <i class="ri-fire-line streak-fire"></i>
                <div class="streak-stats">
                    <div class="streak-stat">
                        <span class="streak-value">{data.best_streak}</span>
                        <span class="streak-label">{t.progress.bestStreak}</span>
                    </div>
                    <div class="streak-divider"></div>
                    <div class="streak-stat">
                        <span class="streak-value">{data.current_streak}</span>
                        <span class="streak-label">{t.progress.current}</span>
                    </div>
                </div>
            </div>
        </GlassCard>
    {:else}
        <!-- Skeleton Preloader -->
        <div class="skeleton-hero">
            <div class="skeleton-ring shimmer"></div>
            <div class="skeleton-line shimmer" style="width: 180px; height: 14px; margin-top: 14px;"></div>
        </div>
        <GlassCard>
            <div class="stats-grid">
                {#each Array(4) as _}
                    <div class="stat-block">
                        <div class="skeleton-circle shimmer" style="width: 22px; height: 22px;"></div>
                        <div class="skeleton-line shimmer" style="width: 40px; height: 24px;"></div>
                        <div class="skeleton-line shimmer" style="width: 56px; height: 10px;"></div>
                    </div>
                {/each}
            </div>
        </GlassCard>
        <div class="skeleton-line shimmer" style="width: 130px; height: 18px; margin-bottom: 15px;"></div>
        <GlassCard>
            <div class="declutter-grid">
                {#each Array(4) as _}
                    <div class="declutter-item">
                        <div class="skeleton-circle shimmer" style="width: 40px; height: 40px;"></div>
                        <div class="skeleton-line shimmer" style="width: 28px; height: 20px;"></div>
                        <div class="skeleton-line shimmer" style="width: 42px; height: 10px;"></div>
                    </div>
                {/each}
            </div>
        </GlassCard>
        <div class="skeleton-line shimmer" style="width: 100px; height: 18px; margin-bottom: 15px;"></div>
        <GlassCard>
            {#each Array(3) as _}
                <div class="skeleton-cat-row">
                    <div class="skeleton-circle shimmer" style="width: 18px; height: 18px;"></div>
                    <div class="skeleton-line shimmer" style="width: 70px; height: 13px;"></div>
                    <div class="skeleton-line shimmer" style="flex: 1; height: 6px; border-radius: 10px;"></div>
                    <div class="skeleton-line shimmer" style="width: 30px; height: 12px;"></div>
                </div>
            {/each}
        </GlassCard>
        <div class="skeleton-line shimmer" style="width: 90px; height: 18px; margin-bottom: 15px;"></div>
        <div class="milestones-row">
            <GlassCard style="flex: 1; text-align: center; padding: 20px;">
                <div class="skeleton-ring-sm shimmer"></div>
                <div class="skeleton-line shimmer" style="width: 40px; height: 14px; margin: 10px auto 0;"></div>
            </GlassCard>
            <GlassCard style="flex: 1; text-align: center; padding: 20px;">
                <div class="skeleton-ring-sm shimmer"></div>
                <div class="skeleton-line shimmer" style="width: 60px; height: 14px; margin: 10px auto 0;"></div>
            </GlassCard>
        </div>
        <GlassCard>
            <div class="skeleton-streak">
                <div class="skeleton-circle shimmer" style="width: 36px; height: 36px;"></div>
                <div class="skeleton-line shimmer" style="width: 60px; height: 28px;"></div>
                <div class="skeleton-line shimmer" style="width: 60px; height: 28px;"></div>
            </div>
        </GlassCard>
    {/if}
</main>

<style>
    /* Header */
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

    /* Hero Ring */
    .hero-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 0 28px;
    }
    .hero-label {
        margin-top: 14px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-soft);
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
    .stats-grid.three-col {
        grid-template-columns: 1fr 1fr 1fr;
    }
    .stat-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .stat-icon {
        font-size: 22px;
        margin-bottom: 2px;
    }
    .stat-icon.pink {
        color: var(--accent-pink);
    }
    .stat-icon.sage {
        color: var(--accent-sage);
    }
    .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .stat-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Declutter Summary */
    .declutter-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 12px;
        text-align: center;
    }
    .declutter-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .declutter-icon {
        font-size: 22px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .declutter-icon.donated { color: #E91E63; background: #FCE4EC; }
    .declutter-icon.sold { color: #4CAF50; background: #E8F5E9; }
    .declutter-icon.gifted { color: #FF9800; background: #FFF3E0; }
    .declutter-icon.trashed { color: #9E9E9E; background: #F5F5F5; }
    .declutter-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .declutter-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .recovered-banner {
        margin-top: 16px;
        padding: 10px 14px;
        background: #E8F5E9;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #2E7D32;
    }
    .recovered-banner i {
        font-size: 18px;
    }

    /* Category Progress */
    .category-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
    }
    .category-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .category-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 100px;
    }
    .category-icon {
        font-size: 18px;
        color: var(--accent-pink);
    }
    .category-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .category-bar {
        flex: 1;
    }
    .category-count {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-soft);
        min-width: 36px;
        text-align: right;
    }
    .category-declutter {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 11px;
        font-weight: 600;
        color: #9E9E9E;
        background: #F5F5F5;
        padding: 2px 6px;
        border-radius: 6px;
    }
    .category-declutter i {
        font-size: 12px;
    }

    /* Milestones Row */
    .milestones-row {
        display: flex;
        gap: 12px;
        margin-bottom: 0;
    }
    .milestone-value {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-dark);
        margin-top: 10px;
    }
    .milestone-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
    }

    /* Streak Highlight */
    .streak-card {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    .streak-fire {
        font-size: 36px;
        color: #FF6B35;
    }
    .streak-stats {
        display: flex;
        align-items: center;
        gap: 20px;
        flex: 1;
    }
    .streak-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
    }
    .streak-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .streak-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .streak-divider {
        width: 1px;
        height: 40px;
        background: rgba(0, 0, 0, 0.1);
    }

    /* Skeleton Preloader */
    .shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
    }
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    .skeleton-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 0 28px;
    }
    .skeleton-ring {
        width: 120px;
        height: 120px;
        border-radius: 50%;
    }
    .skeleton-ring-sm {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        margin: 0 auto;
    }
    .skeleton-line {
        display: inline-block;
    }
    .skeleton-circle {
        border-radius: 50%;
    }
    .skeleton-cat-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
    }
    .skeleton-cat-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .skeleton-streak {
        display: flex;
        align-items: center;
        gap: 20px;
        justify-content: center;
    }
</style>
