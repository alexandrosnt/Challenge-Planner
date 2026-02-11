<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import CategoryPills from '$lib/components/CategoryPills.svelte';
    import SubcategoryPills from '$lib/components/SubcategoryPills.svelte';
    import ItemDetailSheet from '$lib/components/ItemDetailSheet.svelte';
    import { getCategories, getSubcategories, getItems } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { dragscroll } from '$lib/actions/dragscroll';
    import { onMount } from 'svelte';

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
    let selectedStatus = $state('all');
    /** @type {import('$lib/db/queries').Item | null} */
    let selectedItem = $state(null);

    let filteredItems = $derived.by(() => {
        let result = items;
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

    onMount(loadData);

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

<header style="padding: 20px 24px;">
    <div>
        <p style="font-size: 14px; color: var(--text-soft); font-weight: 500;">Your Products</p>
        <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Inventory</h1>
    </div>
</header>

<main>
    <!-- Category Filter -->
    <div class="filter-scroll" use:dragscroll>
        <button class="filter-pill" class:active={selectedCategoryId === 0} onclick={() => handleCategorySelect(0)}>
            All
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
            All ({statusCounts.all})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'active'} onclick={() => selectedStatus = 'active'}>
            Active ({statusCounts.active})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'used_up'} onclick={() => selectedStatus = 'used_up'}>
            Finished ({statusCounts.used_up})
        </button>
        <button class="status-tab" class:active={selectedStatus === 'decluttered'} onclick={() => selectedStatus = 'decluttered'}>
            Decluttered ({statusCounts.decluttered})
        </button>
    </div>

    <!-- Items Grid -->
    {#if loading}
        <div class="items-grid">
            {#each Array(6) as _}
                <GlassCard>
                    <div class="item-card">
                        <div class="shimmer" style="width: 50px; height: 50px; border-radius: var(--radius-m); margin: 0 auto 10px;"></div>
                        <div class="shimmer" style="width: 80px; height: 14px; margin: 0 auto 4px;"></div>
                        <div class="shimmer" style="width: 50px; height: 10px; margin: 0 auto;"></div>
                    </div>
                </GlassCard>
            {/each}
        </div>
    {/if}
    <div class="items-grid" class:hidden={loading}>
        {#each filteredItems as item (item.id)}
            <button class="item-card-btn" onclick={() => handleItemClick(item)}>
                <GlassCard>
                    <div class="item-card">
                        <div class="item-icon">
                            <i class={item.category_icon ?? 'ri-box-3-line'}></i>
                        </div>
                        <h3 class="item-name">{item.name}</h3>
                        {#if item.subcategory_name}
                            <span class="item-sub">{item.subcategory_name}</span>
                        {:else}
                            <span class="item-sub">{item.category_name}</span>
                        {/if}
                        <div class="item-meta">
                            {#if item.cost_per_use != null}
                                <span class="cost-per-use">{item.cost_per_use.toFixed(2)}€/use</span>
                            {/if}
                            {#if (item.usage_count ?? 0) > 0}
                                <span class="usage-badge">{item.usage_count}x</span>
                            {/if}
                        </div>
                    </div>
                </GlassCard>
            </button>
        {:else}
            <div class="empty-state">
                <i class="ri-inbox-line"></i>
                <p>No items yet. Add some from the + button!</p>
            </div>
        {/each}
    </div>
</main>

<ItemDetailSheet item={selectedItem} onClose={handleDetailClose} />

<style>
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

    .items-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    .item-card-btn {
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;
        width: 100%;
    }
    .item-card { text-align: center; }
    .item-icon {
        width: 50px; height: 50px; margin: 0 auto 10px;
        background: #FFF0F3; border-radius: var(--radius-m);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; color: var(--accent-pink);
    }
    .item-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .item-sub {
        font-size: 11px; color: var(--text-soft); text-transform: uppercase;
        letter-spacing: 0.5px; display: block; margin-bottom: 8px;
    }
    .item-meta { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .cost-per-use {
        font-size: 11px; font-weight: 600; color: var(--accent-sage);
        background: #E8F5E9; padding: 3px 8px; border-radius: 8px;
    }
    .usage-badge {
        font-size: 11px; font-weight: 700; color: var(--accent-pink);
        background: #FFF0F3; padding: 3px 8px; border-radius: 8px;
    }
    .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        color: var(--text-soft);
    }
    .empty-state i { font-size: 48px; margin-bottom: 12px; display: block; }
    .empty-state p { font-size: 14px; }
    .hidden { display: none; }
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
