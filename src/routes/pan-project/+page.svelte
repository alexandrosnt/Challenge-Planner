<script lang="ts">
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import PanItemCard from '$lib/components/PanItemCard.svelte';
    import { getPanItems, getPanProjectStats, markPanItemEmptied, removePanItem, type PanProjectItem, type PanProjectStats } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let items = $state<PanProjectItem[]>([]);
    let stats = $state<PanProjectStats | null>(null);
    let loading = $state(true);

    let completionPct = $derived(
        stats && stats.total > 0 ? Math.round((stats.emptied / stats.total) * 100) : 0
    );

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            [items, stats] = await Promise.all([
                getPanItems(userId),
                getPanProjectStats(userId)
            ]);
        } catch (e) {
            console.error('Failed to load pan project data:', e);
        } finally {
            loading = false;
        }
    }

    async function handleMarkEmptied(panItemId: number) {
        await markPanItemEmptied(panItemId);
        await loadData();
    }

    async function handleRemove(panItemId: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await removePanItem(userId, panItemId);
        await loadData();
    }

    onMount(() => {
        loadData();
    });

    export function refresh() {
        loadData();
    }
</script>

<header class="page-header">
    <h1 class="page-title">{t.panProject.title}</h1>
</header>

<main>
    {#if loading}
        <!-- Skeleton -->
        <div class="hero-ring">
            <div class="shimmer" style="width: 120px; height: 120px; border-radius: 50%;"></div>
            <div class="shimmer" style="width: 160px; height: 14px; margin-top: 14px;"></div>
        </div>
        {#each Array(3) as _}
            <GlassCard>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="shimmer" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                    <div style="flex: 1;">
                        <div class="shimmer" style="width: 120px; height: 14px; margin-bottom: 6px;"></div>
                        <div class="shimmer" style="width: 80px; height: 10px;"></div>
                    </div>
                </div>
            </GlassCard>
        {/each}
    {:else}
        <!-- Hero Progress Ring -->
        <div class="hero-ring">
            <ProgressRing value={completionPct} size={120} strokeWidth={7} />
            {#if stats}
                <p class="hero-label">
                    {stats.emptied} {t.panProject.of} {stats.total} {t.panProject.emptied}
                </p>
            {/if}
        </div>

        <!-- Pan Items -->
        {#if items.length > 0}
            <SectionTitle title={t.panProject.progress} actionText="{items.length} {t.common.items}" />
            {#each items as item (item.id)}
                <PanItemCard
                    {item}
                    onMarkEmptied={handleMarkEmptied}
                    onRemove={handleRemove}
                />
            {/each}
        {:else}
            <GlassCard>
                <div class="empty-state">
                    <i class="ri-flask-line empty-icon"></i>
                    <p class="empty-title">{t.panProject.noItems}</p>
                    <p class="empty-text">{t.panProject.emptyState}</p>
                </div>
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
    .hero-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 0 28px;
    }
    .hero-label {
        margin-top: 14px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-soft);
    }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 0;
        gap: 8px;
    }
    .empty-icon {
        font-size: 48px;
        color: var(--accent-sage);
        margin-bottom: 4px;
    }
    .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .empty-text {
        font-size: 13px;
        color: var(--text-soft);
        text-align: center;
        max-width: 250px;
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
