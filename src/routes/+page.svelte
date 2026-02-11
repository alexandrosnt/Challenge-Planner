<script>
    import { onMount } from 'svelte';
    import Header from '$lib/components/Header.svelte';
    import HeroStats from '$lib/components/HeroStats.svelte';
    import CategoryPills from '$lib/components/CategoryPills.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ChallengeCard from '$lib/components/ChallengeCard.svelte';
    import BudgetAlert from '$lib/components/BudgetAlert.svelte';
    import ActivityFeed from '$lib/components/ActivityFeed.svelte';
    import WishlistCard from '$lib/components/WishlistCard.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { openAddModal } from '$lib/stores/modal.svelte';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { dragscroll } from '$lib/actions/dragscroll';

    let auth = getAuthState();

    function getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 5) return 'Good Night';
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    }

    let greeting = $derived(getTimeGreeting());
    let displayName = $derived(auth.isAuthenticated && auth.currentUser?.name ? auth.currentUser.name : 'there');
    import {
        loadHomeData,
        getChallenges,
        updateChallengeProgress,
        getWishlist,
        markWishlistPurchased,
        deleteWishlistItem,
        checkAchievements
    } from '$lib/db/queries';
    import { goto } from '$app/navigation';

    /** @type {import('$lib/db/queries').User | null} */
    let profile = $state(null);
    /** @type {import('$lib/db/queries').Category[]} */
    let categories = $state([]);
    /** @type {import('$lib/db/queries').Challenge[]} */
    let challenges = $state([]);
    /** @type {import('$lib/db/queries').Budget[]} */
    let budgets = $state([]);
    /** @type {import('$lib/db/queries').ComputedStats | null} */
    let stats = $state(null);
    /** @type {import('$lib/db/queries').Streak[]} */
    let streaks = $state([]);
    /** @type {import('$lib/db/queries').ActivityEntry[]} */
    let activity = $state([]);
    /** @type {import('$lib/db/queries').WishlistItem[]} */
    let wishlist = $state([]);
    /** @type {import('$lib/db/queries').Item[]} */
    let items = $state([]);

    let weatherCity = $state('');
    let weatherTemp = $state(null);
    let weatherIcon = $state('');

    let activeChallenges = $derived(challenges.filter(c => c.completed < c.total).slice(0, 2));
    let activeStreaks = $derived(streaks.filter(s => s.active).slice(0, 3));
    let readyWishlist = $derived(wishlist.filter(w => (w.days_remaining ?? 0) === 0));
    let alertBudgets = $derived(budgets.filter(b => b.spent / b.monthly_limit > 0.8));

    let itemCounts = $derived.by(() => {
        /** @type {Record<number, number>} */
        const counts = {};
        for (const item of items) {
            counts[item.category_id] = (counts[item.category_id] || 0) + 1;
        }
        return counts;
    });

    const WMO_ICONS = {
        0: 'ri-sun-line', 1: 'ri-sun-line', 2: 'ri-sun-cloudy-line', 3: 'ri-cloudy-line',
        45: 'ri-mist-line', 48: 'ri-mist-line',
        51: 'ri-drizzle-line', 53: 'ri-drizzle-line', 55: 'ri-drizzle-line',
        61: 'ri-rainy-line', 63: 'ri-rainy-line', 65: 'ri-heavy-showers-line',
        71: 'ri-snowy-line', 73: 'ri-snowy-line', 75: 'ri-snowy-line',
        80: 'ri-showers-line', 81: 'ri-showers-line', 82: 'ri-heavy-showers-line',
        95: 'ri-thunderstorms-line', 96: 'ri-thunderstorms-line', 99: 'ri-thunderstorms-line'
    };

    const WEATHER_CACHE_KEY = 'useup_weather_cache';
    const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    async function fetchWeather() {
        // Check cache first — O(1) localStorage lookup
        try {
            const cached = localStorage.getItem(WEATHER_CACHE_KEY);
            if (cached) {
                const { city, temp, icon, ts } = JSON.parse(cached);
                if (Date.now() - ts < WEATHER_CACHE_TTL) {
                    weatherCity = city;
                    weatherTemp = temp;
                    weatherIcon = icon;
                    return;
                }
            }
        } catch { /* corrupt cache, refetch */ }

        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            const { latitude, longitude } = pos.coords;

            const [weatherRes, geoRes] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`),
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`)
            ]);

            const weather = await weatherRes.json();
            const geo = await geoRes.json();

            weatherTemp = weather.current_weather?.temperature ?? null;
            const code = weather.current_weather?.weathercode ?? 0;
            weatherIcon = WMO_ICONS[/** @type {keyof typeof WMO_ICONS} */ (code)] || 'ri-cloudy-line';
            weatherCity = geo.address?.city || geo.address?.town || geo.address?.village || '';

            // Cache result
            localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
                city: weatherCity, temp: weatherTemp, icon: weatherIcon, ts: Date.now()
            }));
        } catch {
            // Location denied or API failed — silently skip
        }
    }

    onMount(() => {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        // Load DB data and weather in parallel
        loadHomeData(userId).then(data => {
            profile = data.profile;
            categories = data.categories;
            challenges = data.challenges;
            budgets = data.budgets;
            stats = data.stats;
            streaks = data.streaks;
            activity = data.activity;
            wishlist = data.wishlist;
            items = data.items;
            checkAchievements(userId).catch(() => {});
        }).catch(e => console.error('Failed to load home data:', e));

        fetchWeather();
    });

    const quickActions = [
        { icon: 'ri-add-circle-line', label: 'Add Item', action: () => openAddModal() },
        { icon: 'ri-delete-bin-line', label: 'Declutter', action: () => goto('/declutter') },
        { icon: 'ri-archive-drawer-line', label: 'Inventory', action: () => goto('/inventory') },
        { icon: 'ri-line-chart-line', label: 'Insights', action: () => goto('/insights') },
    ];

    /** @param {import('$lib/db/queries').Challenge} challenge */
    async function handleChallengeIncrement(challenge) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        const newCompleted = Math.min(challenge.completed + 1, challenge.total);
        await updateChallengeProgress(userId, challenge.id, newCompleted);
        challenges = await getChallenges(userId);
    }

    /** @param {import('$lib/db/queries').WishlistItem} item */
    async function handleWishlistPurchase(item) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await markWishlistPurchased(userId, item.id);
        wishlist = await getWishlist(userId);
    }

    /** @param {import('$lib/db/queries').WishlistItem} item */
    async function handleWishlistRemove(item) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deleteWishlistItem(userId, item.id);
        wishlist = await getWishlist(userId);
    }
</script>

<Header greeting={greeting} name={displayName} city={weatherCity} temp={weatherTemp} weatherIcon={weatherIcon} />

<main>
    <!-- Hero Stats (Live Computed) -->
    {#if stats}
        <HeroStats
            emptyItems={stats.used_up_items}
            monthlySaved={stats.total_saved}
            noBuyDays={stats.longest_streak}
        />
    {:else}
        <!-- Skeleton HeroStats -->
        <GlassCard>
            <div class="hero-stats-skeleton">
                <div class="skel-stat"><div class="shimmer" style="width: 50px; height: 28px;"></div><div class="shimmer" style="width: 46px; height: 10px; margin-top: 4px;"></div></div>
                <div class="skel-divider"></div>
                <div class="skel-stat"><div class="shimmer" style="width: 50px; height: 28px;"></div><div class="shimmer" style="width: 36px; height: 10px; margin-top: 4px;"></div></div>
                <div class="skel-divider"></div>
                <div class="skel-stat"><div class="shimmer" style="width: 40px; height: 28px;"></div><div class="shimmer" style="width: 64px; height: 10px; margin-top: 4px;"></div></div>
            </div>
        </GlassCard>
        <!-- Skeleton Progress Card -->
        <GlassCard style="margin-bottom: 16px; padding: 16px 20px;">
            <div class="progress-card-inner">
                <div class="shimmer" style="width: 48px; height: 48px; border-radius: 50%;"></div>
                <div class="progress-card-text">
                    <div class="shimmer" style="width: 90px; height: 15px;"></div>
                    <div class="shimmer" style="width: 120px; height: 12px; margin-top: 4px;"></div>
                </div>
                <div class="shimmer" style="width: 22px; height: 22px; border-radius: 4px;"></div>
            </div>
        </GlassCard>
    {/if}

    <!-- My Progress Card -->
    {#if stats}
        {@const completionPct = stats.total_items > 0 ? Math.round((stats.used_up_items / stats.total_items) * 100) : 0}
        <button class="progress-card" onclick={() => goto('/progress')}>
            <GlassCard style="margin-bottom: 16px; padding: 16px 20px;">
                <div class="progress-card-inner">
                    <ProgressRing value={completionPct} size={48} strokeWidth={4} />
                    <div class="progress-card-text">
                        <span class="progress-card-title">My Progress</span>
                        <span class="progress-card-sub">{stats.used_up_items} products finished</span>
                    </div>
                    <i class="ri-arrow-right-s-line progress-card-arrow"></i>
                </div>
            </GlassCard>
        </button>
    {/if}

    <!-- Quick Actions -->
    <div class="quick-actions">
        {#each quickActions as qa (qa.label)}
            <button class="quick-action-btn" onclick={qa.action}>
                <div class="qa-icon">
                    <i class={qa.icon}></i>
                </div>
                <span>{qa.label}</span>
            </button>
        {/each}
    </div>

    <!-- Categories with Counts -->
    <SectionTitle title="Categories" actionText="View All" onAction={() => goto('/inventory')} />
    <CategoryPills {categories} itemCounts={itemCounts} />

    <!-- Active Streaks Highlight -->
    {#if activeStreaks.length > 0}
        <SectionTitle title="Active Streaks" actionText="View All" onAction={() => goto('/projects')} />
        <div class="streaks-compact" use:dragscroll>
            {#each activeStreaks as streak (streak.id)}
                <GlassCard style="padding: 14px;">
                    <div class="streak-mini">
                        <i class="ri-fire-line" style="color: var(--accent-pink);"></i>
                        <span class="streak-num">{streak.current_count}</span>
                        <span class="streak-cat">{streak.category_name || 'All'}</span>
                    </div>
                </GlassCard>
            {/each}
        </div>
    {/if}

    <!-- Top Challenges -->
    {#if activeChallenges.length > 0}
        <SectionTitle title="Current Focus" actionText="View All" onAction={() => goto('/projects')} />
        {#each activeChallenges as challenge (challenge.id)}
            <ChallengeCard
                title={challenge.title}
                icon={challenge.icon}
                tag={challenge.tag}
                completed={challenge.completed}
                total={challenge.total}
                deadline={challenge.deadline}
                onIncrement={() => handleChallengeIncrement(challenge)}
            />
        {/each}
    {/if}

    <!-- Budget Alerts -->
    {#each alertBudgets as budget (budget.id)}
        <BudgetAlert
            categoryName={budget.category_name ?? 'Unknown'}
            spent={budget.spent}
            limit={budget.monthly_limit}
        />
    {/each}

    <!-- Wishlist Ready Items -->
    {#if readyWishlist.length > 0}
        <SectionTitle title="Wishlist Ready" actionText="{readyWishlist.length} ready" />
        {#each readyWishlist as item (item.id)}
            <WishlistCard
                {item}
                onPurchase={handleWishlistPurchase}
                onRemove={handleWishlistRemove}
            />
        {/each}
    {/if}

    <!-- Recent Activity -->
    {#if activity.length > 0}
        <SectionTitle title="Recent Activity" actionText="" />
        <ActivityFeed entries={activity} />
    {/if}
</main>

<style>
    .quick-actions {
        display: flex;
        justify-content: space-around;
        margin-bottom: 24px;
    }
    .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        background: none;
        border: none;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
    }
    .qa-icon {
        width: 50px;
        height: 50px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: var(--accent-pink);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
        transition: 0.2s;
    }
    .quick-action-btn:active .qa-icon {
        transform: scale(0.9);
        background: #FFF0F3;
    }
    .quick-action-btn span {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-soft);
    }

    .progress-card {
        display: block;
        width: 100%;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        font-family: 'Poppins', sans-serif;
    }
    .progress-card-inner {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .progress-card-text {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    .progress-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-dark);
    }
    .progress-card-sub {
        font-size: 12px;
        color: var(--text-soft);
        font-weight: 500;
    }
    .progress-card-arrow {
        font-size: 22px;
        color: var(--text-soft);
    }

    .streaks-compact {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        overflow-x: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .streaks-compact::-webkit-scrollbar { display: none; }
    .streak-mini {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
    }
    .streak-num { font-size: 18px; font-weight: 700; color: var(--text-dark); }
    .streak-cat { font-size: 12px; color: var(--text-soft); font-weight: 500; }

    /* Skeleton */
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
    .hero-stats-skeleton {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .skel-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .skel-divider {
        width: 1px;
        height: 40px;
        background: rgba(0, 0, 0, 0.05);
    }
</style>
