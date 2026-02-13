<script>
    import SubcategoryPills from '$lib/components/SubcategoryPills.svelte';
    import ItemDetailSheet from '$lib/components/ItemDetailSheet.svelte';
    import SelectModeButton from '$lib/components/SelectModeButton.svelte';
    import SelectionBar from '$lib/components/SelectionBar.svelte';
    import SelectableCheckbox from '$lib/components/SelectableCheckbox.svelte';
    import { getCategories, getSubcategories, getItems, deleteItem, deleteItems } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { dragscroll } from '$lib/actions/dragscroll';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import { t } from '$lib/i18n/index.svelte';
    import StarRating from '$lib/components/StarRating.svelte';

    let auth = getAuthState();

    let loading = $state(true);
    /** @type {import('$lib/db/queries').Category[]} */
    let categories = $state([]);
    /** @type {import('$lib/db/queries').Subcategory[]} */
    let subcategories = $state([]);
    /** @type {import('$lib/db/queries').Item[]} */
    let items = $state([]);
    let selectedCategoryId = $state(0);
    let selectedSubcategoryId = $state(0);
    let refresh = getRefreshSignal();
    let selectedStatus = $state('all');
    let searchQuery = $state('');
    let pageSize = 20;
    let visibleCount = $state(20);
    /** @type {import('$lib/db/queries').Item | null} */
    let selectedItem = $state(null);

    // Select mode
    let selectMode = $state(false);
    /** @type {Set<number>} */
    let selectedIds = $state(new Set());
    let deletingSelected = $state(false);

    function toggleSelectMode() {
        selectMode = !selectMode;
        selectedIds = new Set();
    }

    /** @param {number} id */
    function toggleSelection(id) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedIds = next;
    }

    function selectAllItems() {
        selectedIds = new Set(filteredItems.map(i => i.id));
    }

    function deselectAllItems() {
        selectedIds = new Set();
    }

    async function handleDeleteSelected() {
        const userId = auth.currentUser?.id;
        if (!userId || selectedIds.size === 0) return;
        if (!confirm(t.common.confirmDeleteMultiple)) return;
        deletingSelected = true;
        try {
            await deleteItems(userId, [...selectedIds]);
            selectedIds = new Set();
            selectMode = false;
            triggerRefresh();
            await loadData();
        } finally {
            deletingSelected = false;
        }
    }

    /** @param {Event} e @param {number} id */
    async function handleInlineDelete(e, id) {
        e.stopPropagation();
        const userId = auth.currentUser?.id;
        if (!userId) return;
        if (!confirm(t.itemDetail.deleteConfirm)) return;
        await deleteItem(userId, id);
        triggerRefresh();
        await loadData();
    }

    let filteredItems = $derived.by(() => {
        let result = items;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(q) ||
                (i.category_name?.toLowerCase().includes(q)) ||
                (i.subcategory_name?.toLowerCase().includes(q))
            );
        }
        if (selectedCategoryId > 0) {
            result = result.filter(i => i.category_id === selectedCategoryId);
        }
        if (selectedSubcategoryId > 0) {
            result = result.filter(i => i.subcategory_id === selectedSubcategoryId);
        }
        if (selectedStatus !== 'all') {
            result = result.filter(i => i.status === selectedStatus);
        }
        return result;
    });

    let paginatedItems = $derived(filteredItems.slice(0, visibleCount));
    let hasMore = $derived(filteredItems.length > visibleCount);

    function showMore() {
        visibleCount += pageSize;
    }

    // Reset pagination when filters change
    $effect(() => {
        searchQuery;
        selectedCategoryId;
        selectedSubcategoryId;
        selectedStatus;
        visibleCount = pageSize;
    });

    let statusCounts = $derived.by(() => {
        const catItems = selectedCategoryId === 0 ? items : items.filter(i => i.category_id === selectedCategoryId);
        const counts = { all: catItems.length, active: 0, used_up: 0, decluttered: 0 };
        for (const i of catItems) {
            if (i.status === 'active') counts.active++;
            else if (i.status === 'used_up') counts.used_up++;
            else if (i.status === 'decluttered') counts.decluttered++;
        }
        return counts;
    });

    $effect(() => { refresh.value; loadData(); });

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            const [c, i] = await Promise.all([getCategories(), getItems(userId)]);
            categories = c;
            items = i;
        } catch (e) {
            console.error('Failed to load inventory data:', e);
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (selectedCategoryId > 0) {
            getSubcategories(selectedCategoryId).then(sc => {
                subcategories = sc;
            });
        } else {
            subcategories = [];
        }
        selectedSubcategoryId = 0;
    });

    /** @param {number} id */
    function handleCategorySelect(id) {
        selectedCategoryId = id;
    }

    /** @param {import('$lib/db/queries').Item} item */
    function handleItemClick(item) {
        selectedItem = item;
    }

    async function handleDetailClose() {
        selectedItem = null;
        const userId = auth.currentUser?.id;
        if (userId) items = await getItems(userId);
    }
</script>

<header class="inv-header">
    <div>
        <p style="font-size: 14px; color: var(--text-soft); font-weight: 500;">{t.inventory.yourProducts}</p>
        <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{t.inventory.title}</h1>
    </div>
    {#if items.length > 0}
        <SelectModeButton active={selectMode} onToggle={toggleSelectMode} />
    {/if}
</header>

<main>
    <!-- Search -->
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

    <!-- Category Filter -->
    <div class="filter-scroll" use:dragscroll>
        <button class="filter-pill" class:active={selectedCategoryId === 0} onclick={() => handleCategorySelect(0)}>
            {t.common.all}
        </button>
        {#each categories as cat (cat.id)}
            <button class="filter-pill" class:active={selectedCategoryId === cat.id} onclick={() => handleCategorySelect(cat.id)}>
                <i class={cat.icon}></i> {cat.name}
            </button>
        {/each}
    </div>

    <!-- Subcategory Filter -->
    {#if subcategories.length > 0}
        <SubcategoryPills
            {subcategories}
            selected={selectedSubcategoryId}
            onSelect={(/** @type {number} */ id) => selectedSubcategoryId = id}
        />
    {/if}

    <!-- Status Tabs -->
    <div class="status-tabs" use:dragscroll>
        <button class="status-tab" class:active={selectedStatus === 'all'} onclick={() => selectedStatus = 'all'}>
            {t.common.all} ({statusCounts.all})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'active'} onclick={() => selectedStatus = 'active'}>
            {t.common.active} ({statusCounts.active})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'used_up'} onclick={() => selectedStatus = 'used_up'}>
            {t.common.finished} ({statusCounts.used_up})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'decluttered'} onclick={() => selectedStatus = 'decluttered'}>
            {t.common.decluttered} ({statusCounts.decluttered})
        </button>
    </div>

    <!-- Items -->
    {#if loading}
        <div class="items-list">
            {#each Array(4) as _}
                <div class="list-item">
                    <div class="shimmer" style="width: 42px; height: 42px; border-radius: var(--radius-s); flex-shrink: 0;"></div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <div class="shimmer" style="width: 120px; height: 14px;"></div>
                        <div class="shimmer" style="width: 70px; height: 10px;"></div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="items-list">
            {#each paginatedItems as item (item.id)}
                {#if selectMode}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="list-item-btn" onclick={() => toggleSelection(item.id)}>
                        <div class="list-item" class:selected-item={selectedIds.has(item.id)}>
                            <SelectableCheckbox checked={selectedIds.has(item.id)} onToggle={() => toggleSelection(item.id)} />
                            <div class="list-item-icon">
                                <i class={item.category_icon ?? 'ri-box-3-line'}></i>
                            </div>
                            <div class="list-item-info">
                                <h3 class="list-item-name">{item.name}{#if item.quantity > 1} <span class="qty-badge">x{item.quantity}</span>{/if}</h3>
                                <span class="list-item-sub">{item.subcategory_name || item.category_name}</span>
                                {#if item.rating > 0}<StarRating rating={item.rating} />{/if}
                            </div>
                            <div class="list-item-right">
                                <span class="list-status-badge" class:status-active={item.status === 'active'} class:status-finished={item.status === 'used_up'} class:status-decluttered={item.status === 'decluttered'}>
                                    {#if item.status === 'active'}
                                        {t.common.active}
                                    {:else if item.status === 'used_up'}
                                        {t.common.finished}
                                    {:else}
                                        {t.common.decluttered}
                                    {/if}
                                </span>
                                {#if (item.usage_count ?? 0) > 0}
                                    <span class="list-usage">{item.usage_count}x</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="list-item-btn" onclick={() => handleItemClick(item)}>
                        <div class="list-item">
                            <div class="list-item-icon">
                                <i class={item.category_icon ?? 'ri-box-3-line'}></i>
                            </div>
                            <div class="list-item-info">
                                <h3 class="list-item-name">{item.name}{#if item.quantity > 1} <span class="qty-badge">x{item.quantity}</span>{/if}</h3>
                                <span class="list-item-sub">{item.subcategory_name || item.category_name}</span>
                                {#if item.rating > 0}<StarRating rating={item.rating} />{/if}
                            </div>
                            <div class="list-item-right">
                                <button class="inline-delete-btn" onclick={(e) => handleInlineDelete(e, item.id)} aria-label={t.inventory.deleteItem}>
                                    <i class="ri-delete-bin-6-line"></i>
                                </button>
                                <span class="list-status-badge" class:status-active={item.status === 'active'} class:status-finished={item.status === 'used_up'} class:status-decluttered={item.status === 'decluttered'}>
                                    {#if item.status === 'active'}
                                        {t.common.active}
                                    {:else if item.status === 'used_up'}
                                        {t.common.finished}
                                    {:else}
                                        {t.common.decluttered}
                                    {/if}
                                </span>
                                {#if (item.usage_count ?? 0) > 0}
                                    <span class="list-usage">{item.usage_count}x</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
            {:else}
                <div class="empty-state">
                    <i class="ri-inbox-line"></i>
                    <p>{t.inventory.emptyState}</p>
                </div>
            {/each}
        </div>
        {#if hasMore}
            <button class="show-more-btn" onclick={showMore}>
                {t.common.showMore} ({filteredItems.length - visibleCount} {t.common.remaining})
            </button>
        {/if}
    {/if}
</main>

<ItemDetailSheet item={selectedItem} onClose={handleDetailClose} />

<SelectionBar
    selectedCount={selectedIds.size}
    totalCount={filteredItems.length}
    onSelectAll={selectAllItems}
    onDeselectAll={deselectAllItems}
    onDeleteSelected={handleDeleteSelected}
    deleting={deletingSelected}
/>

<style>
    .inv-header {
        padding: 20px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
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
    .filter-scroll {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 10px;
        margin: 0 -24px 15px -24px;
        padding: 0 24px 10px 24px;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .filter-scroll::-webkit-scrollbar { display: none; }
    .filter-pill {
        padding: 10px 18px;
        border-radius: 50px;
        border: none;
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-soft);
        white-space: nowrap;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        transition: 0.2s;
        flex-shrink: 0;
    }
    .filter-pill.active {
        background: var(--accent-pink);
        color: white;
    }
    .filter-pill i { font-size: 16px; }

    .status-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .status-tabs::-webkit-scrollbar { display: none; }
    .status-tab {
        padding: 8px 14px;
        border-radius: 50px;
        border: 1px solid rgba(0,0,0,0.06);
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-soft);
        white-space: nowrap;
        cursor: pointer;
        transition: 0.2s;
        flex-shrink: 0;
    }
    .status-tab.active {
        background: var(--text-dark);
        color: white;
        border-color: var(--text-dark);
    }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-soft);
    }
    .empty-state i { font-size: 48px; margin-bottom: 12px; display: block; }
    .empty-state p { font-size: 14px; }
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

    .items-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .list-item-btn {
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;
        width: 100%;
    }
    div.list-item-btn {
        -webkit-tap-highlight-color: transparent;
    }
    .list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-s);
        box-shadow: var(--glass-shadow);
        transition: transform 0.2s;
    }
    .list-item:active { transform: scale(0.98); }
    .list-item-icon {
        width: 42px; height: 42px;
        background: #FFF0F3; border-radius: var(--radius-s);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; color: var(--accent-pink);
        flex-shrink: 0;
    }
    .list-item-info {
        flex: 1;
        min-width: 0;
    }
    .list-item-name {
        font-size: 14px; font-weight: 600; color: var(--text-dark);
        margin: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qty-badge {
        font-size: 11px;
        font-weight: 700;
        color: white;
        background: var(--accent-pink);
        padding: 1px 6px;
        border-radius: 50px;
        vertical-align: middle;
    }
    .list-item-sub {
        font-size: 11px; color: var(--text-soft);
        text-transform: uppercase; letter-spacing: 0.3px;
    }
    .list-item-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        flex-shrink: 0;
    }
    .list-status-badge {
        font-size: 10px; font-weight: 600;
        padding: 3px 10px;
        border-radius: 50px;
        letter-spacing: 0.3px;
    }
    .list-status-badge.status-active {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
    }
    .list-status-badge.status-finished {
        background: rgba(148, 180, 159, 0.2);
        color: #6b8f5e;
    }
    .list-status-badge.status-decluttered {
        background: rgba(0, 0, 0, 0.06);
        color: var(--text-soft);
    }
    .list-usage {
        font-size: 11px; font-weight: 700; color: var(--accent-pink);
    }
    .list-item.selected-item {
        border-color: var(--accent-pink);
        box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.15);
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
    }
    .inline-delete-btn:active {
        color: var(--accent-pink);
        transform: scale(0.85);
    }
    .show-more-btn {
        width: 100%;
        padding: 14px;
        margin-top: 12px;
        border: 1px dashed rgba(0, 0, 0, 0.12);
        border-radius: var(--radius-s);
        background: transparent;
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: var(--accent-pink);
        cursor: pointer;
        transition: 0.2s;
        -webkit-tap-highlight-color: transparent;
    }
    .show-more-btn:active {
        transform: scale(0.97);
        background: rgba(255, 107, 129, 0.04);
    }
</style>
