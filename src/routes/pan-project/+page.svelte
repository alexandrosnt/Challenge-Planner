<script lang="ts">
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import PanItemCard from '$lib/components/PanItemCard.svelte';
    import SelectModeButton from '$lib/components/SelectModeButton.svelte';
    import SelectionBar from '$lib/components/SelectionBar.svelte';
    import { getPanItems, getPanProjectStats, markPanItemEmptied, undoPanItemEmptied, removePanItem, removePanItems, updatePanItem, type PanProjectItem, type PanProjectStats } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();
    let refresh = getRefreshSignal();

    const PAGE_SIZE = 20;

    let items = $state<PanProjectItem[]>([]);
    let stats = $state<PanProjectStats | null>(null);
    let loading = $state(true);
    let panPage = $state(0);
    let panHasMore = $state(false);

    let editingId: number | null = $state(null);
    let editQuantity = $state(1);
    let saving = $state(false);
    let searchQuery = $state('');

    // Select mode
    let selectMode = $state(false);
    let selectedIds = $state(new Set<number>());
    let deletingSelected = $state(false);

    function toggleSelectMode() {
        selectMode = !selectMode;
        selectedIds = new Set();
    }

    function toggleSelection(id: number) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedIds = next;
    }

    function selectAll() {
        selectedIds = new Set(filteredItems.map(i => i.id));
    }

    function deselectAll() {
        selectedIds = new Set();
    }

    async function handleDeleteSelected() {
        const userId = auth.currentUser?.id;
        if (!userId || selectedIds.size === 0) return;
        if (!confirm(t.common.confirmDeleteMultiple)) return;
        deletingSelected = true;
        try {
            await removePanItems(userId, [...selectedIds]);
            selectedIds = new Set();
            selectMode = false;
            triggerRefresh();
            await loadData();
        } finally {
            deletingSelected = false;
        }
    }

    let filteredItems = $derived.by(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.trim().toLowerCase();
        return items.filter(i =>
            i.item_name.toLowerCase().includes(q) ||
            i.category_name.toLowerCase().includes(q)
        );
    });

    let completionPct = $derived(
        stats && stats.total > 0 ? Math.round((stats.emptied / stats.total) * 100) : 0
    );

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            const [rawItems, s] = await Promise.all([
                getPanItems(userId, PAGE_SIZE + 1, panPage * PAGE_SIZE),
                getPanProjectStats(userId)
            ]);
            panHasMore = rawItems.length > PAGE_SIZE;
            items = rawItems.slice(0, PAGE_SIZE);
            stats = s;
        } catch (e) {
            console.error('Failed to load pan project data:', e);
        } finally {
            loading = false;
        }
    }

    function prevPanPage() {
        if (panPage > 0) { panPage--; loadData(); }
    }

    function nextPanPage() {
        if (panHasMore) { panPage++; loadData(); }
    }

    async function handleMarkEmptied(panItemId: number) {
        await markPanItemEmptied(panItemId);
        triggerRefresh();
        await loadData();
    }

    async function handleUndoEmptied(panItemId: number) {
        await undoPanItemEmptied(panItemId);
        triggerRefresh();
        await loadData();
    }

    async function handleRemove(panItemId: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await removePanItem(userId, panItemId);
        triggerRefresh();
        await loadData();
    }

    function startEdit(id: number) {
        const item = items.find(i => i.id === id);
        if (!item) return;
        editingId = id;
        editQuantity = item.quantity;
    }

    function cancelEdit() {
        editingId = null;
        editQuantity = 1;
        saving = false;
    }

    async function handleSaveQuantity() {
        const userId = auth.currentUser?.id;
        if (!userId || editingId === null) return;
        saving = true;
        try {
            await updatePanItem(userId, editingId, editQuantity);
            triggerRefresh();
            await loadData();
        } finally {
            cancelEdit();
        }
    }

    $effect(() => {
        refresh.value;
        loadData();
    });
</script>

<header class="page-header">
    <h1 class="page-title">{t.panProject.title}</h1>
    {#if items.length > 0}
        <SelectModeButton active={selectMode} onToggle={toggleSelectMode} />
    {/if}
</header>

<main>
    {#if loading}
        <!-- Skeleton -->
        <div class="hero-ring">
            <div class="shimmer" style="width: 120px; height: 120px; border-radius: 50%;"></div>
            <div class="shimmer" style="width: 160px; height: 14px; margin-top: 14px;"></div>
        </div>
        {#each Array(3) as _, i (i)}
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
            <div class="search-bar">
                <i class="ri-search-line search-icon"></i>
                <input
                    class="search-input"
                    type="text"
                    placeholder={t.inventory.searchPlaceholder}
                    bind:value={searchQuery}
                />
                {#if searchQuery}
                    <button class="search-clear" onclick={() => searchQuery = ''}>
                        <i class="ri-close-line"></i>
                    </button>
                {/if}
            </div>

            <SectionTitle title={t.panProject.progress} actionText="{t.common.page} {panPage + 1}" />
            {#each filteredItems as item (item.id)}
                <PanItemCard
                    {item}
                    onMarkEmptied={selectMode ? undefined : handleMarkEmptied}
                    onUndoEmptied={selectMode ? undefined : handleUndoEmptied}
                    onRemove={selectMode ? undefined : handleRemove}
                    onEdit={selectMode ? undefined : startEdit}
                    editing={editingId === item.id}
                    bind:editQuantity
                    onSaveEdit={handleSaveQuantity}
                    onCancelEdit={cancelEdit}
                    {selectMode}
                    selected={selectedIds.has(item.id)}
                    onSelect={toggleSelection}
                />
            {/each}

            {#if panPage > 0 || panHasMore}
                <div class="pagination-row">
                    <button class="page-btn" onclick={prevPanPage} disabled={panPage === 0}>
                        <i class="ri-arrow-left-s-line"></i>
                    </button>
                    <span class="page-indicator">{panPage + 1}</span>
                    <button class="page-btn" onclick={nextPanPage} disabled={!panHasMore}>
                        <i class="ri-arrow-right-s-line"></i>
                    </button>
                </div>
            {/if}
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

<SelectionBar
    selectedCount={selectedIds.size}
    totalCount={filteredItems.length}
    onSelectAll={selectAll}
    onDeselectAll={deselectAll}
    onDeleteSelected={handleDeleteSelected}
    deleting={deletingSelected}
/>

<style>
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
    .search-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 50px;
        margin-bottom: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .search-icon {
        font-size: 18px;
        color: var(--text-soft);
        flex-shrink: 0;
    }
    .search-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-dark);
    }
    .search-input::placeholder {
        color: var(--text-soft);
        font-weight: 400;
    }
    .search-clear {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 2px;
        cursor: pointer;
        color: var(--text-soft);
        font-size: 18px;
        display: flex;
        align-items: center;
        -webkit-tap-highlight-color: transparent;
    }
    .search-clear:active {
        color: var(--accent-pink);
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
    .pagination-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 8px 0 16px;
    }
    .page-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.06);
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 20px;
        color: var(--text-soft);
        transition: 0.2s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }
    .page-btn:active:not(:disabled) {
        transform: scale(0.9);
        background: #f5f5f5;
    }
    .page-btn:disabled {
        opacity: 0.3;
        cursor: default;
    }
    .page-indicator {
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: var(--text-dark);
        min-width: 24px;
        text-align: center;
    }
</style>
