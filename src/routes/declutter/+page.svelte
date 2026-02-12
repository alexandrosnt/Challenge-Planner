<script lang="ts">
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import SelectModeButton from '$lib/components/SelectModeButton.svelte';
    import SelectionBar from '$lib/components/SelectionBar.svelte';
    import { loadDeclutterPageData, checkAchievements, deleteDeclutterLogEntry, deleteDeclutterLogEntries, type DeclutterPageData } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let data = $state<DeclutterPageData | null>(null);
    let refresh = getRefreshSignal();

    // Select mode for history
    let selectMode = $state(false);
    let selectedHistoryIds = $state(new Set<number>());
    let deletingSelected = $state(false);

    function toggleSelectMode() {
        selectMode = !selectMode;
        selectedHistoryIds = new Set();
    }

    function toggleHistorySelection(id: number) {
        const next = new Set(selectedHistoryIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedHistoryIds = next;
    }

    function selectAllHistory() {
        if (!data) return;
        selectedHistoryIds = new Set(data.decluttered.map(d => d.id));
    }

    function deselectAllHistory() {
        selectedHistoryIds = new Set();
    }

    async function handleDeleteSelectedHistory() {
        const userId = auth.currentUser?.id;
        if (!userId || selectedHistoryIds.size === 0) return;
        if (!confirm(t.common.confirmDeleteMultiple)) return;
        deletingSelected = true;
        try {
            await deleteDeclutterLogEntries(userId, [...selectedHistoryIds]);
            selectedHistoryIds = new Set();
            selectMode = false;
            triggerRefresh();
            await loadData();
        } finally {
            deletingSelected = false;
        }
    }

    async function handleInlineDeleteHistory(e: Event, id: number) {
        e.stopPropagation();
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deleteDeclutterLogEntry(userId, id);
        triggerRefresh();
        await loadData();
    }

    let donatedItems = $derived(data ? data.decluttered.filter(d => d.method === 'donated') : []);
    let soldItems = $derived(data ? data.decluttered.filter(d => d.method === 'sold') : []);
    let giftedItems = $derived(data ? data.decluttered.filter(d => d.method === 'gifted') : []);
    let trashedItems = $derived(data ? data.decluttered.filter(d => d.method === 'trashed') : []);

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            data = await loadDeclutterPageData(userId);
        } catch (e) {
            console.error('Failed to load declutter data:', e);
        }
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    $effect(() => {
        refresh.value;
        loadData().then(() => {
            const userId = auth.currentUser?.id;
            if (userId) checkAchievements(userId).catch(() => {});
        });
    });
</script>

<!-- Header -->
<header class="page-header">
    <h1 class="page-title">{t.declutter.title}</h1>
    {#if data && data.decluttered.length > 0}
        <SelectModeButton active={selectMode} onToggle={toggleSelectMode} />
    {/if}
</header>

<main>
    {#if data}
        <!-- Stats Bar -->
        <GlassCard>
            <div class="stats-row">
                <div class="mini-stat">
                    <i class="ri-heart-line mini-stat-icon donated"></i>
                    <span class="mini-stat-value">{data.stats.donated}</span>
                    <span class="mini-stat-label">{t.declutter.donated}</span>
                </div>
                <div class="mini-stat">
                    <i class="ri-money-dollar-circle-line mini-stat-icon sold"></i>
                    <span class="mini-stat-value">{data.stats.sold}</span>
                    <span class="mini-stat-label">{t.declutter.sold}</span>
                </div>
                <div class="mini-stat">
                    <i class="ri-gift-line mini-stat-icon gifted"></i>
                    <span class="mini-stat-value">{data.stats.gifted}</span>
                    <span class="mini-stat-label">{t.declutter.gifted}</span>
                </div>
                <div class="mini-stat">
                    <i class="ri-delete-bin-line mini-stat-icon trashed"></i>
                    <span class="mini-stat-value">{data.stats.trashed}</span>
                    <span class="mini-stat-label">{t.declutter.trashed}</span>
                </div>
            </div>
            {#if data.stats.total_recovered > 0}
                <div class="recovered-banner">
                    <i class="ri-coins-line"></i>
                    <span>{data.stats.total_recovered.toFixed(2)}&euro; {t.declutter.recoveredFromSold}</span>
                </div>
            {/if}
        </GlassCard>

        <!-- Already Decluttered -->
        {#if data.decluttered.length > 0}
            <SectionTitle title={t.declutter.alreadyDecluttered} actionText="{data.decluttered.length} {t.common.total}" />

            {#if donatedItems.length > 0}
                <div class="decluttered-section">
                    <div class="decluttered-section-header">
                        <i class="ri-heart-line section-icon donated"></i>
                        <span class="section-label">{t.declutter.donated}</span>
                        <span class="section-count">{donatedItems.length}</span>
                    </div>
                    <GlassCard>
                        {#each donatedItems as item (item.id)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div class="decluttered-row" class:selected-row={selectMode && selectedHistoryIds.has(item.id)} onclick={selectMode ? () => toggleHistorySelection(item.id) : undefined}>
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
                                {#if !selectMode}
                                    <button class="inline-delete-btn" onclick={(e) => handleInlineDeleteHistory(e, item.id)} aria-label={t.declutter.deleteRecord}>
                                        <i class="ri-delete-bin-6-line"></i>
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </GlassCard>
                </div>
            {/if}

            {#if soldItems.length > 0}
                <div class="decluttered-section">
                    <div class="decluttered-section-header">
                        <i class="ri-money-dollar-circle-line section-icon sold"></i>
                        <span class="section-label">{t.declutter.sold}</span>
                        <span class="section-count">{soldItems.length}</span>
                    </div>
                    <GlassCard>
                        {#each soldItems as item (item.id)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div class="decluttered-row" class:selected-row={selectMode && selectedHistoryIds.has(item.id)} onclick={selectMode ? () => toggleHistorySelection(item.id) : undefined}>
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
                                {#if item.amount_recovered > 0 && !selectMode}
                                    <span class="recovered-amount">+{item.amount_recovered.toFixed(2)}&euro;</span>
                                {/if}
                                {#if !selectMode}
                                    <button class="inline-delete-btn" onclick={(e) => handleInlineDeleteHistory(e, item.id)} aria-label={t.declutter.deleteRecord}>
                                        <i class="ri-delete-bin-6-line"></i>
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </GlassCard>
                </div>
            {/if}

            {#if giftedItems.length > 0}
                <div class="decluttered-section">
                    <div class="decluttered-section-header">
                        <i class="ri-gift-line section-icon gifted"></i>
                        <span class="section-label">{t.declutter.gifted}</span>
                        <span class="section-count">{giftedItems.length}</span>
                    </div>
                    <GlassCard>
                        {#each giftedItems as item (item.id)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div class="decluttered-row" class:selected-row={selectMode && selectedHistoryIds.has(item.id)} onclick={selectMode ? () => toggleHistorySelection(item.id) : undefined}>
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
                                {#if !selectMode}
                                    <button class="inline-delete-btn" onclick={(e) => handleInlineDeleteHistory(e, item.id)} aria-label={t.declutter.deleteRecord}>
                                        <i class="ri-delete-bin-6-line"></i>
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </GlassCard>
                </div>
            {/if}

            {#if trashedItems.length > 0}
                <div class="decluttered-section">
                    <div class="decluttered-section-header">
                        <i class="ri-delete-bin-line section-icon trashed"></i>
                        <span class="section-label">{t.declutter.trashed}</span>
                        <span class="section-count">{trashedItems.length}</span>
                    </div>
                    <GlassCard>
                        {#each trashedItems as item (item.id)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div class="decluttered-row" class:selected-row={selectMode && selectedHistoryIds.has(item.id)} onclick={selectMode ? () => toggleHistorySelection(item.id) : undefined}>
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
                                {#if !selectMode}
                                    <button class="inline-delete-btn" onclick={(e) => handleInlineDeleteHistory(e, item.id)} aria-label={t.declutter.deleteRecord}>
                                        <i class="ri-delete-bin-6-line"></i>
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </GlassCard>
                </div>
            {/if}
        {/if}
    {:else}
        <!-- Skeleton Preloader -->
        <GlassCard>
            <div class="stats-row">
                {#each Array(4) as _, i (i)}
                    <div class="mini-stat">
                        <div class="skeleton-circle shimmer" style="width: 28px; height: 28px;"></div>
                        <div class="skeleton-line shimmer" style="width: 24px; height: 20px;"></div>
                        <div class="skeleton-line shimmer" style="width: 44px; height: 10px;"></div>
                    </div>
                {/each}
            </div>
        </GlassCard>

        <div class="skeleton-line shimmer" style="width: 160px; height: 18px; margin-bottom: 15px; margin-top: 16px;"></div>

        <div class="skeleton-line shimmer" style="width: 100px; height: 16px; margin-bottom: 10px;"></div>
        <GlassCard>
            {#each Array(2) as _, i (i)}
                <div class="skeleton-decluttered-row">
                    <div class="skeleton-circle shimmer" style="width: 20px; height: 20px;"></div>
                    <div class="skeleton-line shimmer" style="width: 100px; height: 14px;"></div>
                    <div class="skeleton-line shimmer" style="width: 60px; height: 10px;"></div>
                </div>
            {/each}
        </GlassCard>
    {/if}
</main>

<SelectionBar
    selectedCount={selectedHistoryIds.size}
    totalCount={data ? data.decluttered.length : 0}
    onSelectAll={selectAllHistory}
    onDeselectAll={deselectAllHistory}
    onDeleteSelected={handleDeleteSelectedHistory}
    deleting={deletingSelected}
/>

<style>
    /* Header */
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
    }
    .page-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: -0.3px;
    }

    /* Stats Row */
    .stats-row {
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    .mini-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .mini-stat-icon {
        font-size: 22px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .mini-stat-icon.donated { color: #E91E63; background: #FCE4EC; }
    .mini-stat-icon.sold { color: #4CAF50; background: #E8F5E9; }
    .mini-stat-icon.gifted { color: #FF9800; background: #FFF3E0; }
    .mini-stat-icon.trashed { color: #9E9E9E; background: #F5F5F5; }
    .mini-stat-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .mini-stat-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Recovered Banner */
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

    /* Decluttered Sections */
    .decluttered-section {
        margin-bottom: 0;
    }
    .decluttered-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
    }
    .section-icon {
        font-size: 18px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .section-icon.donated { color: #E91E63; background: #FCE4EC; }
    .section-icon.sold { color: #4CAF50; background: #E8F5E9; }
    .section-icon.gifted { color: #FF9800; background: #FFF3E0; }
    .section-icon.trashed { color: #9E9E9E; background: #F5F5F5; }
    .section-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .section-count {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        background: rgba(0, 0, 0, 0.05);
        padding: 2px 8px;
        border-radius: 10px;
    }
    .decluttered-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
    }
    .decluttered-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .decluttered-item-icon {
        font-size: 18px;
        color: var(--accent-pink);
        flex-shrink: 0;
    }
    .decluttered-item-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }
    .decluttered-item-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .decluttered-item-meta {
        font-size: 11px;
        color: var(--text-soft);
    }
    .recovered-amount {
        font-size: 13px;
        font-weight: 700;
        color: #4CAF50;
        flex-shrink: 0;
    }
    .inline-delete-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--text-soft);
        font-size: 16px;
        transition: color 0.2s, transform 0.15s;
        -webkit-tap-highlight-color: transparent;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    .inline-delete-btn:active {
        color: var(--accent-pink);
        transform: scale(0.85);
    }
    .selected-row {
        background: rgba(233, 30, 99, 0.04);
        border-radius: 8px;
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
    .skeleton-line {
        display: inline-block;
    }
    .skeleton-circle {
        border-radius: 50%;
    }
    .skeleton-decluttered-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
    }
    .skeleton-decluttered-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
</style>
