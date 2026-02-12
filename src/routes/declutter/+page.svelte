<script lang="ts">
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import { loadDeclutterPageData, logDeclutter, checkAchievements, type DeclutterPageData, type DeclutterCandidate } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let data = $state<DeclutterPageData | null>(null);
    let selectedItem = $state<DeclutterCandidate | null>(null);
    let method = $state('donated');
    let reason = $state('');
    let amountRecovered = $state('');
    let processing = $state(false);

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

    function selectItem(item: DeclutterCandidate, selectedMethod: string) {
        selectedItem = item;
        method = selectedMethod;
        reason = '';
        amountRecovered = '';
    }

    function cancelSelection() {
        selectedItem = null;
    }

    async function confirmDeclutter() {
        if (!selectedItem) return;
        const userId = auth.currentUser?.id;
        if (!userId) return;
        processing = true;
        try {
            await logDeclutter(
                userId,
                selectedItem.id,
                method,
                reason || undefined,
                method === 'sold' ? Number(amountRecovered) || 0 : 0
            );
            selectedItem = null;
            await loadData();
            await checkAchievements(userId);
        } catch (e) {
            console.error('Failed to declutter item:', e);
        } finally {
            processing = false;
        }
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    onMount(async () => {
        await loadData();
        const userId = auth.currentUser?.id;
        if (userId) await checkAchievements(userId);
    });
</script>

<!-- Header -->
<header class="page-header">
    <h1 class="page-title">{t.declutter.title}</h1>
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

        <!-- Active Items to Declutter -->
        <SectionTitle title={t.declutter.readyToLetGo} actionText="{data.candidates.length} {t.common.items}" />

        {#if data.candidates.length > 0}
            <div class="candidates-grid">
                {#each data.candidates as item (item.id)}
                    <div class="candidate-card" class:selected={selectedItem?.id === item.id}>
                        <div class="candidate-info">
                            <i class="{item.category_icon} candidate-icon"></i>
                            <div class="candidate-text">
                                <span class="candidate-name">{item.name}</span>
                                <span class="candidate-category">{item.subcategory_name ?? item.category_name}</span>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button
                                class="action-btn donate"
                                aria-label="Donate {item.name}"
                                onclick={() => selectItem(item, 'donated')}
                            >
                                <i class="ri-heart-line"></i>
                            </button>
                            <button
                                class="action-btn sell"
                                aria-label="Sell {item.name}"
                                onclick={() => selectItem(item, 'sold')}
                            >
                                <i class="ri-money-dollar-circle-line"></i>
                            </button>
                            <button
                                class="action-btn gift"
                                aria-label="Gift {item.name}"
                                onclick={() => selectItem(item, 'gifted')}
                            >
                                <i class="ri-gift-line"></i>
                            </button>
                            <button
                                class="action-btn trash"
                                aria-label="Trash {item.name}"
                                onclick={() => selectItem(item, 'trashed')}
                            >
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <GlassCard>
                <div class="empty-state">
                    <i class="ri-checkbox-circle-line empty-icon"></i>
                    <p class="empty-text">{t.declutter.emptyState}</p>
                </div>
            </GlassCard>
        {/if}

        <!-- Confirmation Sheet -->
        {#if selectedItem}
            <div class="confirmation-sheet">
                <GlassCard style="border: 2px solid var(--accent-pink);">
                    <div class="confirm-header">
                        <i class="{selectedItem.category_icon} confirm-item-icon"></i>
                        <div class="confirm-item-info">
                            <span class="confirm-item-name">{selectedItem.name}</span>
                            <span class="confirm-method">
                                {#if method === 'donated'}
                                    <i class="ri-heart-line"></i> {t.declutter.donate}
                                {:else if method === 'sold'}
                                    <i class="ri-money-dollar-circle-line"></i> {t.declutter.sell}
                                {:else if method === 'gifted'}
                                    <i class="ri-gift-line"></i> {t.declutter.gift}
                                {:else}
                                    <i class="ri-delete-bin-line"></i> {t.declutter.trash}
                                {/if}
                            </span>
                        </div>
                    </div>

                    <textarea
                        class="reason-input"
                        placeholder={t.declutter.reasonPlaceholder}
                        bind:value={reason}
                        rows="2"
                    ></textarea>

                    {#if method === 'sold'}
                        <div class="amount-input-wrapper">
                            <span class="amount-prefix">&euro;</span>
                            <input
                                type="number"
                                class="amount-input"
                                placeholder={t.declutter.amountRecovered}
                                bind:value={amountRecovered}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    {/if}

                    <div class="confirm-actions">
                        <button class="btn-cancel" onclick={cancelSelection} disabled={processing}>
                            {t.common.cancel}
                        </button>
                        <button class="btn-confirm" onclick={confirmDeclutter} disabled={processing}>
                            {#if processing}
                                <i class="ri-loader-4-line spin"></i> {t.declutter.processing}
                            {:else}
                                {t.common.confirm}
                            {/if}
                        </button>
                    </div>
                </GlassCard>
            </div>
        {/if}

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
                            <div class="decluttered-row">
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
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
                            <div class="decluttered-row">
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
                                {#if item.amount_recovered > 0}
                                    <span class="recovered-amount">+{item.amount_recovered.toFixed(2)}&euro;</span>
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
                            <div class="decluttered-row">
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
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
                            <div class="decluttered-row">
                                <i class="{item.category_icon} decluttered-item-icon"></i>
                                <div class="decluttered-item-info">
                                    <span class="decluttered-item-name">{item.item_name}</span>
                                    <span class="decluttered-item-meta">{item.category_name} &middot; {formatDate(item.created_at)}</span>
                                </div>
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

        <div class="skeleton-line shimmer" style="width: 140px; height: 18px; margin-bottom: 15px;"></div>

        <div class="candidates-grid">
            {#each Array(4) as _, i (i)}
                <div class="skeleton-candidate shimmer"></div>
            {/each}
        </div>

        <div class="skeleton-line shimmer" style="width: 160px; height: 18px; margin-bottom: 15px; margin-top: 24px;"></div>

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

    /* Candidates Grid */
    .candidates-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 24px;
    }
    .candidate-card {
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-m);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: transform 0.2s, border-color 0.2s;
    }
    .candidate-card.selected {
        border-color: var(--accent-pink);
        box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.15);
    }
    .candidate-card:active {
        transform: scale(0.97);
    }
    .candidate-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .candidate-icon {
        font-size: 20px;
        color: var(--accent-pink);
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(233, 30, 99, 0.08);
        flex-shrink: 0;
    }
    .candidate-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }
    .candidate-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-dark);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .candidate-category {
        font-size: 11px;
        color: var(--text-soft);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Action Buttons */
    .action-buttons {
        display: flex;
        gap: 6px;
        justify-content: center;
    }
    .action-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .action-btn:active {
        transform: scale(0.85);
    }
    .action-btn.donate {
        background: #FCE4EC;
        color: #E91E63;
    }
    .action-btn.sell {
        background: #E8F5E9;
        color: #4CAF50;
    }
    .action-btn.gift {
        background: #FFF3E0;
        color: #FF9800;
    }
    .action-btn.trash {
        background: #F5F5F5;
        color: #9E9E9E;
    }

    /* Empty State */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 0;
        gap: 12px;
    }
    .empty-icon {
        font-size: 40px;
        color: var(--accent-sage);
    }
    .empty-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-soft);
        text-align: center;
    }

    /* Confirmation Sheet */
    .confirmation-sheet {
        margin-bottom: 0;
    }
    .confirm-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
    }
    .confirm-item-icon {
        font-size: 24px;
        color: var(--accent-pink);
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(233, 30, 99, 0.08);
        flex-shrink: 0;
    }
    .confirm-item-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .confirm-item-name {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .confirm-method {
        font-size: 13px;
        font-weight: 600;
        color: var(--accent-pink);
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .reason-input {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-s);
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        color: var(--text-dark);
        background: rgba(255, 255, 255, 0.5);
        resize: none;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }
    .reason-input:focus {
        border-color: var(--accent-pink);
    }
    .amount-input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 10px 12px;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-s);
        background: rgba(255, 255, 255, 0.5);
        transition: border-color 0.2s;
    }
    .amount-input-wrapper:focus-within {
        border-color: #4CAF50;
    }
    .amount-prefix {
        font-size: 15px;
        font-weight: 700;
        color: #4CAF50;
    }
    .amount-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .amount-input::placeholder {
        color: var(--text-soft);
        font-weight: 400;
    }
    .confirm-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
    }
    .btn-cancel {
        flex: 1;
        padding: 12px;
        border-radius: var(--radius-s);
        border: 1px solid var(--glass-border);
        background: transparent;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-soft);
        cursor: pointer;
        transition: transform 0.2s;
    }
    .btn-cancel:active {
        transform: scale(0.95);
    }
    .btn-confirm {
        flex: 1;
        padding: 12px;
        border-radius: var(--radius-s);
        border: none;
        background: var(--primary-gradient);
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        transition: transform 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }
    .btn-confirm:active {
        transform: scale(0.95);
    }
    .btn-confirm:disabled,
    .btn-cancel:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* Spinner */
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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
    .skeleton-candidate {
        height: 110px;
        border-radius: var(--radius-m);
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
