<script lang="ts">
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import BookCard from '$lib/components/BookCard.svelte';
    import SelectModeButton from '$lib/components/SelectModeButton.svelte';
    import SelectionBar from '$lib/components/SelectionBar.svelte';
    import { getBooks, getBookStats, updateBookProgress, deleteBook, deleteBooks, type Book, type BookStats } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import { t } from '$lib/i18n/index.svelte';
    import { SvelteSet } from 'svelte/reactivity';

    let auth = getAuthState();
    let refresh = getRefreshSignal();

    const PAGE_SIZE = 20;

    let books = $state<Book[]>([]);
    let stats = $state<BookStats | null>(null);
    let loading = $state(true);
    let bookPage = $state(0);
    let bookHasMore = $state(false);

    let searchQuery = $state('');

    // Select mode
    let selectMode = $state(false);
    let selectedIds = $state(new SvelteSet<number>());
    let deletingSelected = $state(false);

    function toggleSelectMode() {
        selectMode = !selectMode;
        selectedIds = new SvelteSet();
    }

    function toggleSelection(id: number) {
        const next = new SvelteSet(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedIds = next;
    }

    function selectAll() {
        selectedIds = new SvelteSet(filteredBooks.map(b => b.id));
    }

    function deselectAll() {
        selectedIds = new SvelteSet();
    }

    async function handleDeleteSelected() {
        const userId = auth.currentUser?.id;
        if (!userId || selectedIds.size === 0) return;
        if (!confirm(t.common.confirmDeleteMultiple)) return;
        deletingSelected = true;
        try {
            await deleteBooks(userId, [...selectedIds]);
            selectedIds = new SvelteSet();
            selectMode = false;
            triggerRefresh();
            await loadData();
        } finally {
            deletingSelected = false;
        }
    }

    let filteredBooks = $derived.by(() => {
        if (!searchQuery.trim()) return books;
        const q = searchQuery.trim().toLowerCase();
        return books.filter(b =>
            b.title.toLowerCase().includes(q) ||
            (b.author ?? '').toLowerCase().includes(q)
        );
    });

    let completionPct = $derived(
        stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    );

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            const [rawBooks, s] = await Promise.all([
                getBooks(userId, PAGE_SIZE + 1, bookPage * PAGE_SIZE),
                getBookStats(userId)
            ]);
            bookHasMore = rawBooks.length > PAGE_SIZE;
            books = rawBooks.slice(0, PAGE_SIZE);
            stats = s;
        } catch (e) {
            console.error('Failed to load books data:', e);
        } finally {
            loading = false;
        }
    }

    function prevBookPage() {
        if (bookPage > 0) { bookPage--; loadData(); }
    }

    function nextBookPage() {
        if (bookHasMore) { bookPage++; loadData(); }
    }

    async function handleRemove(bookId: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deleteBook(userId, bookId);
        triggerRefresh();
        await loadData();
    }

    function handleEdit(bookId: number) {
        // Placeholder — edit functionality to be implemented
    }

    $effect(() => {
        refresh.value;
        loadData();
    });
</script>

<header class="page-header">
    <h1 class="page-title">{t.books.title}</h1>
    {#if books.length > 0}
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
                    {stats.completed} {t.books.of} {stats.total} {t.books.completed}
                </p>
            {/if}
        </div>

        <!-- Stats row -->
        {#if stats}
            <div class="stats-row">
                <div class="stat-pill">
                    <span class="stat-value">{stats.reading}</span>
                    <span class="stat-label">{t.books.booksReading}</span>
                </div>
                <div class="stat-pill">
                    <span class="stat-value">{stats.pagesRead}</span>
                    <span class="stat-label">{t.books.pagesRead}</span>
                </div>
            </div>
        {/if}

        <!-- Book Cards -->
        {#if books.length > 0}
            <div class="search-bar">
                <i class="ri-search-line search-icon"></i>
                <input
                    class="search-input"
                    type="text"
                    placeholder={t.books.searchPlaceholder}
                    bind:value={searchQuery}
                />
                {#if searchQuery}
                    <button class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear">
                        <i class="ri-close-line"></i>
                    </button>
                {/if}
            </div>

            <SectionTitle title={t.books.progress} actionText="{t.common.page} {bookPage + 1}" />
            {#each filteredBooks as book (book.id)}
                <BookCard
                    {book}
                    onEdit={selectMode ? undefined : handleEdit}
                    onRemove={selectMode ? undefined : handleRemove}
                    {selectMode}
                    selected={selectedIds.has(book.id)}
                    onSelect={toggleSelection}
                />
            {/each}

            <!-- Pagination -->
            {#if bookPage > 0 || bookHasMore}
                <div class="pagination-row">
                    <button class="page-btn" onclick={prevBookPage} disabled={bookPage === 0} aria-label="Previous page">
                        <i class="ri-arrow-left-s-line"></i>
                    </button>
                    <span class="page-indicator">{bookPage + 1}</span>
                    <button class="page-btn" onclick={nextBookPage} disabled={!bookHasMore} aria-label="Next page">
                        <i class="ri-arrow-right-s-line"></i>
                    </button>
                </div>
            {/if}
        {:else}
            <GlassCard>
                <div class="empty-state">
                    <i class="ri-book-open-line empty-icon"></i>
                    <p class="empty-title">{t.books.noBooks}</p>
                    <p class="empty-text">{t.books.emptyState}</p>
                </div>
            </GlassCard>
        {/if}
    {/if}
</main>

<SelectionBar
    selectedCount={selectedIds.size}
    totalCount={filteredBooks.length}
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
    .stats-row {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 20px;
    }
    .stat-pill {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-m);
        padding: 10px 20px;
    }
    .stat-value {
        font-family: 'Poppins', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .stat-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.3px;
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
