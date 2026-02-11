<script>
    import { onMount } from 'svelte';
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ChallengeCard from '$lib/components/ChallengeCard.svelte';
    import StreakCard from '$lib/components/StreakCard.svelte';
    import AchievementBadge from '$lib/components/AchievementBadge.svelte';
    import {
        getChallenges,
        updateChallengeProgress,
        getStreaks,
        getAchievements,
        checkAchievements
    } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { dragscroll } from '$lib/actions/dragscroll';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();

    let loading = $state(true);
    /** @type {import('$lib/db/queries').Challenge[]} */
    let challenges = $state([]);
    /** @type {import('$lib/db/queries').Streak[]} */
    let streaks = $state([]);
    /** @type {import('$lib/db/queries').Achievement[]} */
    let achievements = $state([]);

    let activeChallenges = $derived(challenges.filter(c => c.completed < c.total));
    let completedChallenges = $derived(challenges.filter(c => c.completed >= c.total));
    let activeStreaks = $derived(streaks.filter(s => s.active));
    let unlockedCount = $derived(achievements.filter(a => a.unlocked).length);

    onMount(async () => {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await loadData(userId);
        await checkAchievements(userId);
        achievements = await getAchievements(userId);
    });

    /** @param {number} userId */
    async function loadData(userId) {
        const [ch, st, ac] = await Promise.all([
            getChallenges(userId),
            getStreaks(userId),
            getAchievements(userId)
        ]);
        challenges = ch;
        streaks = st;
        achievements = ac;
        loading = false;
    }

    /** @param {import('$lib/db/queries').Challenge} challenge */
    async function handleIncrement(challenge) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        const newCompleted = Math.min(challenge.completed + 1, challenge.total);
        await updateChallengeProgress(userId, challenge.id, newCompleted);
        challenges = await getChallenges(userId);
        await checkAchievements(userId);
        achievements = await getAchievements(userId);
    }
</script>

<header style="padding: 20px 24px;">
    <div>
        <p style="font-size: 14px; color: var(--text-soft); font-weight: 500;">{t.projects.yourGoals}</p>
        <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">{t.projects.title}</h1>
    </div>
</header>

<main>
    {#if loading}
        <!-- Skeleton Preloader -->
        <div class="shimmer" style="width: 130px; height: 18px; margin-bottom: 15px;"></div>
        {#each Array(2) as _}
            <GlassCard>
                <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px;">
                    <div class="shimmer" style="width: 50px; height: 50px; border-radius: var(--radius-m); flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <div class="shimmer" style="width: 70px; height: 12px; margin-bottom: 6px;"></div>
                        <div class="shimmer" style="width: 140px; height: 16px;"></div>
                    </div>
                    <div class="shimmer" style="width: 56px; height: 56px; border-radius: 50%;"></div>
                </div>
                <div class="shimmer" style="width: 100%; height: 10px; border-radius: 10px;"></div>
            </GlassCard>
        {/each}
        <div class="shimmer" style="width: 100px; height: 18px; margin-bottom: 15px;"></div>
        <div class="achievements-grid">
            {#each Array(6) as _}
                <div style="text-align: center;">
                    <div class="shimmer" style="width: 48px; height: 48px; border-radius: 50%; margin: 0 auto 8px;"></div>
                    <div class="shimmer" style="width: 50px; height: 10px; margin: 0 auto;"></div>
                </div>
            {/each}
        </div>
    {:else}
    <!-- Active Challenges -->
    {#if activeChallenges.length > 0}
        <SectionTitle title={t.projects.activeChallenges} actionText="{activeChallenges.length} {t.common.active}" />
        {#each activeChallenges as challenge (challenge.id)}
            <ChallengeCard
                title={challenge.title}
                icon={challenge.icon}
                tag={challenge.tag}
                completed={challenge.completed}
                total={challenge.total}
                deadline={challenge.deadline}
                onIncrement={() => handleIncrement(challenge)}
            />
        {/each}
    {/if}

    <!-- No-Buy Streaks -->
    {#if activeStreaks.length > 0}
        <SectionTitle title={t.projects.noBuyStreaks} actionText="{activeStreaks.length} {t.common.active}" />
        <div class="streaks-scroll" use:dragscroll>
            {#each activeStreaks as streak (streak.id)}
                <StreakCard {streak} />
            {/each}
        </div>
    {/if}

    <!-- Achievements -->
    <SectionTitle title={t.projects.achievements} actionText="{unlockedCount}/{achievements.length}" />
    {#if achievements.length > 0}
        <div class="achievements-grid">
            {#each achievements as achievement (achievement.id)}
                <AchievementBadge {achievement} />
            {/each}
        </div>
    {:else}
        <div class="empty-hint">
            <p>{t.projects.achievementsHint}</p>
        </div>
    {/if}

    <!-- Completed Challenges -->
    {#if completedChallenges.length > 0}
        <SectionTitle title={t.projects.completed} actionText="{completedChallenges.length} {t.common.done}" />
        {#each completedChallenges as challenge (challenge.id)}
            <ChallengeCard
                title={challenge.title}
                icon={challenge.icon}
                tag={challenge.tag}
                completed={challenge.completed}
                total={challenge.total}
                deadline={challenge.deadline}
            />
        {/each}
    {/if}

    {#if challenges.length === 0 && streaks.length === 0}
        <div class="empty-state">
            <i class="ri-trophy-line"></i>
            <p>{t.projects.emptyState}</p>
        </div>
    {/if}
    {/if}
</main>

<style>
    .streaks-scroll {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 10px;
        margin: 0 -24px 20px -24px;
        padding: 0 24px 10px 24px;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .streaks-scroll::-webkit-scrollbar { display: none; }

    .achievements-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }

    .empty-hint {
        text-align: center; padding: 20px;
        color: var(--text-soft); font-size: 13px;
        margin-bottom: 24px;
    }

    .empty-state {
        text-align: center; padding: 60px 20px; color: var(--text-soft);
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
</style>
