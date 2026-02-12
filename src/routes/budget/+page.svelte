<script lang="ts">
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressBar from '$lib/components/ProgressBar.svelte';
    import SelectModeButton from '$lib/components/SelectModeButton.svelte';
    import SelectionBar from '$lib/components/SelectionBar.svelte';
    import { getBudgetWithSpending, getPurchases, getTotalSpentThisMonth, getCategories, updateBudget, deleteBudget, deleteBudgets, updatePurchase, deletePurchase, deletePurchases, type Budget, type Purchase, type Category } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { openModal } from '$lib/stores/modal.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();
    let refresh = getRefreshSignal();

    let budgets = $state<Budget[]>([]);
    let purchases = $state<Purchase[]>([]);
    let totalSpent = $state(0);
    let loading = $state(true);
    let currentMonth = $state(new Date().toISOString().slice(0, 7));

    // Edit state
    let editingId: number | null = $state(null);
    let editName: string = $state('');
    let editCategoryId: number = $state(0);
    let editLimit: string = $state('');
    let editCarryover: boolean = $state(false);
    let confirmDeleteId: number | null = $state(null);
    let saving: boolean = $state(false);
    let categories: Category[] = $state([]);

    // Select mode
    let selectMode = $state(false);
    let selectedBudgetIds = $state(new Set<number>());
    let selectedPurchaseIds = $state(new Set<number>());
    let deletingSelected = $state(false);

    let selectionCount = $derived(selectedBudgetIds.size + selectedPurchaseIds.size);
    let selectionTotal = $derived(budgets.length + purchases.length);

    function toggleSelectMode() {
        selectMode = !selectMode;
        selectedBudgetIds = new Set();
        selectedPurchaseIds = new Set();
    }

    function toggleBudgetSelection(id: number) {
        const next = new Set(selectedBudgetIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedBudgetIds = next;
    }

    function togglePurchaseSelection(id: number) {
        const next = new Set(selectedPurchaseIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        selectedPurchaseIds = next;
    }

    function selectAllBudgetItems() {
        selectedBudgetIds = new Set(budgets.map(b => b.id));
        selectedPurchaseIds = new Set(purchases.map(p => p.id));
    }

    function deselectAllBudgetItems() {
        selectedBudgetIds = new Set();
        selectedPurchaseIds = new Set();
    }

    async function handleDeleteSelectedBudgetItems() {
        const userId = auth.currentUser?.id;
        if (!userId || selectionCount === 0) return;
        if (!confirm(t.common.confirmDeleteMultiple)) return;
        deletingSelected = true;
        try {
            if (selectedBudgetIds.size > 0) {
                await deleteBudgets(userId, [...selectedBudgetIds]);
            }
            if (selectedPurchaseIds.size > 0) {
                await deletePurchases(userId, [...selectedPurchaseIds]);
            }
            selectedBudgetIds = new Set();
            selectedPurchaseIds = new Set();
            selectMode = false;
            triggerRefresh();
            await loadData();
        } finally {
            deletingSelected = false;
        }
    }

    async function handleInlineDeleteBudget(e: Event, id: number) {
        e.stopPropagation();
        if (confirmDeleteId !== id) {
            confirmDeleteId = id;
            return;
        }
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deleteBudget(userId, id);
        confirmDeleteId = null;
        triggerRefresh();
        await loadData();
    }

    async function handleInlineDeletePurchase(e: Event, id: number) {
        e.stopPropagation();
        if (confirmDeletePurchaseId !== id) {
            confirmDeletePurchaseId = id;
            return;
        }
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deletePurchase(userId, id);
        confirmDeletePurchaseId = null;
        triggerRefresh();
        await loadData();
    }

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

    async function startEdit(budget: Budget) {
        editingId = budget.id;
        editName = budget.name ?? '';
        editCategoryId = budget.category_id ?? 0;
        editLimit = String(budget.monthly_limit);
        editCarryover = budget.carryover === 1;
        confirmDeleteId = null;
        categories = await getCategories();
    }

    function cancelEdit() {
        editingId = null;
        editName = '';
        editCategoryId = 0;
        editLimit = '';
        editCarryover = false;
        confirmDeleteId = null;
        saving = false;
    }

    async function handleSaveBudget() {
        if (editingId === null) return;
        const userId = auth.currentUser?.id;
        if (!userId) return;
        saving = true;
        try {
            await updateBudget(userId, editingId, {
                name: editName.trim() || null,
                category_id: editCategoryId === 0 ? null : editCategoryId,
                monthly_limit: parseFloat(editLimit) || 0,
                carryover: editCarryover,
            });
            triggerRefresh();
            await loadData();
            cancelEdit();
        } catch (e) {
            console.error('Failed to save budget:', e);
        } finally {
            saving = false;
        }
    }

    async function handleDeleteBudget(id: number) {
        if (confirmDeleteId !== id) {
            confirmDeleteId = id;
            return;
        }
        const userId = auth.currentUser?.id;
        if (!userId) return;
        saving = true;
        try {
            await deleteBudget(userId, id);
            triggerRefresh();
            await loadData();
            cancelEdit();
        } catch (e) {
            console.error('Failed to delete budget:', e);
        } finally {
            saving = false;
        }
    }

    // Purchase edit state
    let editPurchaseId: number | null = $state(null);
    let editPurchaseName = $state('');
    let editPurchaseAmount = $state('');
    let editPurchaseDate = $state('');
    let editPurchaseNotes = $state('');
    let savingPurchase = $state(false);
    let confirmDeletePurchaseId: number | null = $state(null);

    function startEditPurchase(purchase: Purchase) {
        editPurchaseId = purchase.id;
        editPurchaseName = purchase.name;
        editPurchaseAmount = String(purchase.amount);
        editPurchaseDate = purchase.purchase_date;
        editPurchaseNotes = purchase.notes ?? '';
        confirmDeletePurchaseId = null;
    }

    function cancelEditPurchase() {
        editPurchaseId = null;
        editPurchaseName = '';
        editPurchaseAmount = '';
        editPurchaseDate = '';
        editPurchaseNotes = '';
        savingPurchase = false;
        confirmDeletePurchaseId = null;
    }

    async function handleSavePurchase() {
        if (editPurchaseId === null) return;
        const userId = auth.currentUser?.id;
        if (!userId) return;
        savingPurchase = true;
        try {
            await updatePurchase(userId, editPurchaseId, {
                name: editPurchaseName.trim(),
                amount: parseFloat(editPurchaseAmount) || 0,
                purchase_date: editPurchaseDate,
                notes: editPurchaseNotes.trim() || null,
            });
            triggerRefresh();
            await loadData();
            cancelEditPurchase();
        } catch (e) {
            console.error('Failed to save purchase:', e);
        } finally {
            savingPurchase = false;
        }
    }

    async function handleDeletePurchase(id: number) {
        if (confirmDeletePurchaseId !== id) {
            confirmDeletePurchaseId = id;
            return;
        }
        const userId = auth.currentUser?.id;
        if (!userId) return;
        savingPurchase = true;
        try {
            await deletePurchase(userId, id);
            triggerRefresh();
            await loadData();
            cancelEditPurchase();
        } catch (e) {
            console.error('Failed to delete purchase:', e);
        } finally {
            savingPurchase = false;
        }
    }

    $effect(() => {
        refresh.value;
        loadData();
    });
</script>

<header class="page-header">
    <h1 class="page-title">{t.budgetPage.title}</h1>
    <div class="header-actions">
        <button class="add-budget-btn" onclick={() => openModal('add-budget')}>
            <i class="ri-add-line"></i>
            {t.budgetPage.addBudget}
        </button>
        {#if budgets.length > 0 || purchases.length > 0}
            <SelectModeButton active={selectMode} onToggle={toggleSelectMode} />
        {/if}
    </div>
</header>

<main>
    {#if loading}
        <!-- Skeleton -->
        <GlassCard>
            <div class="shimmer" style="width: 100%; height: 80px; border-radius: 12px;"></div>
        </GlassCard>
        {#each Array(2) as _, i (i)}
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
                    {#if editingId === budget.id}
                        <div class="edit-form">
                            <div class="form-group">
                                <label for="edit-name">{t.budgetPage.budgetName}</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    bind:value={editName}
                                    placeholder={t.budgetPage.budgetNamePlaceholder}
                                />
                            </div>
                            <div class="form-group">
                                <label for="edit-category">{t.budgetPage.categoryOptional}</label>
                                <select id="edit-category" bind:value={editCategoryId}>
                                    <option value={0}>{t.common.none}</option>
                                    {#each categories as cat (cat.id)}
                                        <option value={cat.id}>{cat.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-limit">{t.budgetPage.monthlyLimit}</label>
                                <input
                                    id="edit-limit"
                                    type="number"
                                    bind:value={editLimit}
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <label class="checkbox-row">
                                <input type="checkbox" bind:checked={editCarryover} />
                                <span>{t.budgetPage.carryOver}</span>
                            </label>
                            <div class="edit-actions">
                                <button class="btn-cancel" onclick={cancelEdit} disabled={saving}>
                                    {t.common.cancel}
                                </button>
                                <button class="btn-save" onclick={handleSaveBudget} disabled={saving}>
                                    {saving ? t.budgetPage.saving : t.budgetPage.save}
                                </button>
                            </div>
                            <button
                                class="btn-delete"
                                onclick={() => handleDeleteBudget(budget.id)}
                                disabled={saving}
                            >
                                {#if confirmDeleteId === budget.id}
                                    {saving ? t.budgetPage.deleting : t.budgetPage.deleteConfirm}
                                {:else}
                                    <i class="ri-delete-bin-line"></i> {t.budgetPage.deleteBudget}
                                {/if}
                            </button>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="budget-row" class:selected-row={selectMode && selectedBudgetIds.has(budget.id)} onclick={() => selectMode ? toggleBudgetSelection(budget.id) : startEdit(budget)}>
                            <div class="budget-header">
                                <div class="budget-cat">
                                    <i class="{budget.category_icon ?? 'ri-wallet-3-line'} budget-icon"></i>
                                    <span class="budget-name">{budget.display_name}</span>
                                </div>
                                <div class="budget-header-actions">
                                    {#if !selectMode}
                                        <button class="inline-delete-btn" onclick={(e) => handleInlineDeleteBudget(e, budget.id)} aria-label={t.budgetPage.deleteBudget}>
                                            {#if confirmDeleteId === budget.id}
                                                <i class="ri-check-line" style="color: var(--accent-pink);"></i>
                                            {:else}
                                                <i class="ri-delete-bin-6-line"></i>
                                            {/if}
                                        </button>
                                    {/if}
                                    <span class="budget-limit">{formatCurrency(budget.monthly_limit)}</span>
                                </div>
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
                    {/if}
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
                    {#if editPurchaseId === purchase.id}
                        <div class="purchase-edit-form">
                            <div class="form-group">
                                <label for="ep-name">{t.budgetPage.purchaseName}</label>
                                <input id="ep-name" type="text" bind:value={editPurchaseName} />
                            </div>
                            <div class="form-row-2">
                                <div class="form-group">
                                    <label for="ep-amount">{t.budgetPage.purchaseAmount}</label>
                                    <input id="ep-amount" type="number" step="0.01" min="0" bind:value={editPurchaseAmount} />
                                </div>
                                <div class="form-group">
                                    <label for="ep-date">{t.budgetPage.purchaseDate}</label>
                                    <input id="ep-date" type="date" bind:value={editPurchaseDate} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="ep-notes">{t.budgetPage.purchaseNotes}</label>
                                <input id="ep-notes" type="text" bind:value={editPurchaseNotes} placeholder="..." />
                            </div>
                            <div class="edit-actions">
                                <button class="btn-cancel" onclick={cancelEditPurchase} disabled={savingPurchase}>
                                    {t.common.cancel}
                                </button>
                                <button class="btn-save" onclick={handleSavePurchase} disabled={savingPurchase}>
                                    {savingPurchase ? t.budgetPage.saving : t.budgetPage.save}
                                </button>
                            </div>
                            <button
                                class="btn-delete"
                                onclick={() => handleDeletePurchase(purchase.id)}
                                disabled={savingPurchase}
                            >
                                {#if confirmDeletePurchaseId === purchase.id}
                                    {savingPurchase ? t.budgetPage.deleting : t.budgetPage.deleteConfirm}
                                {:else}
                                    <i class="ri-delete-bin-line"></i> {t.budgetPage.deletePurchase}
                                {/if}
                            </button>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="purchase-row" class:selected-row={selectMode && selectedPurchaseIds.has(purchase.id)} onclick={() => selectMode ? togglePurchaseSelection(purchase.id) : startEditPurchase(purchase)}>
                            <div class="purchase-info">
                                <span class="purchase-name">{purchase.name}</span>
                                <span class="purchase-meta">{purchase.category_name} &middot; {purchase.purchase_date}</span>
                            </div>
                            <div class="purchase-right">
                                {#if !selectMode}
                                    <button class="inline-delete-btn" onclick={(e) => handleInlineDeletePurchase(e, purchase.id)} aria-label={t.budgetPage.deletePurchase}>
                                        {#if confirmDeletePurchaseId === purchase.id}
                                            <i class="ri-check-line" style="color: var(--accent-pink);"></i>
                                        {:else}
                                            <i class="ri-delete-bin-6-line"></i>
                                        {/if}
                                    </button>
                                {/if}
                                <span class="purchase-amount">-{formatCurrency(purchase.amount)}</span>
                            </div>
                        </div>
                    {/if}
                {/each}
            </GlassCard>
        {/if}

    {/if}
</main>

<SelectionBar
    selectedCount={selectionCount}
    totalCount={selectionTotal}
    onSelectAll={selectAllBudgetItems}
    onDeselectAll={deselectAllBudgetItems}
    onDeleteSelected={handleDeleteSelectedBudgetItems}
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
    .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .add-budget-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: 50px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        cursor: pointer;
        transition: 0.2s;
        -webkit-tap-highlight-color: transparent;
    }
    .add-budget-btn i {
        font-size: 14px;
    }
    .add-budget-btn:active {
        transform: scale(0.95);
        background: #f5f5f5;
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
        cursor: pointer;
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
        cursor: pointer;
        transition: background 0.15s;
        border-radius: 8px;
        margin: 0 -4px;
        padding: 10px 4px;
    }
    .purchase-row:active {
        background: rgba(0, 0, 0, 0.03);
    }
    .purchase-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .purchase-edit-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }
    .form-row-2 {
        display: flex;
        gap: 10px;
    }
    .form-row-2 .form-group {
        flex: 1;
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

    /* Edit form styles */
    .edit-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .form-group label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .form-group input,
    .form-group select {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        font-weight: 500;
        color: var(--text-dark);
        outline: none;
        transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus {
        border-color: var(--accent-pink);
    }
    .checkbox-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-dark);
        cursor: pointer;
    }
    .checkbox-row input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--accent-pink);
    }
    .edit-actions {
        display: flex;
        gap: 10px;
    }
    .btn-cancel,
    .btn-save {
        flex: 1;
        padding: 10px 0;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--text-soft);
    }
    .btn-save {
        background: var(--accent-pink);
        color: white;
    }
    .btn-cancel:disabled,
    .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .btn-delete {
        width: 100%;
        padding: 10px 0;
        border: 1px solid rgba(233, 30, 99, 0.2);
        border-radius: 10px;
        background: rgba(233, 30, 99, 0.04);
        color: var(--accent-pink);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-delete:hover {
        background: rgba(233, 30, 99, 0.1);
    }
    .btn-delete:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .budget-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .purchase-right {
        display: flex;
        align-items: center;
        gap: 8px;
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
    }
    .inline-delete-btn:active {
        color: var(--accent-pink);
        transform: scale(0.85);
    }
    .selected-row {
        background: rgba(233, 30, 99, 0.04);
        border-radius: 8px;
    }
</style>
