<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import LoginForm from '$lib/components/LoginForm.svelte';
    import { getUserProfile, updateUserProfile, getItems, getChallenges, getComputedStats } from '$lib/db/queries';
    import { getAuthState, logout } from '$lib/stores/auth.svelte';
    import { onMount } from 'svelte';

    let auth = getAuthState();

    let name = $state('');
    let greeting = $state('');
    let email = $state('');
    let saving = $state(false);
    let saved = $state(false);
    let totalItems = $state(0);
    let totalChallenges = $state(0);
    let usedUpItems = $state(0);

    onMount(async () => {
        const userId = auth.currentUser?.id;
        if (!userId) return;

        const profile = await getUserProfile(userId);
        if (profile) {
            name = profile.name || '';
            greeting = profile.greeting || '';
            email = profile.email || '';
        }

        const stats = await getComputedStats(userId);
        totalItems = stats.total_items;
        usedUpItems = stats.used_up_items;

        const challenges = await getChallenges(userId);
        if (challenges) {
            totalChallenges = challenges.length;
        }
    });

    async function handleSave() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        saving = true;
        await updateUserProfile(userId, name, greeting);
        saving = false;
        saved = true;
        setTimeout(() => {
            saved = false;
        }, 2000);
    }

    function handleLogout() {
        logout();
    }
</script>

<header style="padding: 20px 24px;">
    <div>
        <p style="font-size: 14px; color: var(--text-soft); font-weight: 500;">Settings</p>
        <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Profile</h1>
    </div>
</header>

<main>
    {#if !auth.isAuthenticated}
        <LoginForm />
    {:else}
        <!-- Profile Avatar -->
        <div class="avatar-section">
            <div class="avatar">
                <i class="ri-user-smile-line"></i>
            </div>
            <h2 class="avatar-name">{name || 'User'}</h2>
            {#if email}
                <p class="avatar-email">{email}</p>
            {/if}
        </div>

        <!-- Quick Stats -->
        <GlassCard>
            <div class="profile-stats">
                <div class="p-stat">
                    <h3>{totalItems}</h3>
                    <p>Items</p>
                </div>
                <div class="p-stat">
                    <h3>{usedUpItems}</h3>
                    <p>Used Up</p>
                </div>
                <div class="p-stat">
                    <h3>{totalChallenges}</h3>
                    <p>Challenges</p>
                </div>
            </div>
        </GlassCard>

        <!-- Edit Profile -->
        <GlassCard>
            <h3 class="card-title">Edit Profile</h3>
            <div class="form-group">
                <label for="p-name">Display Name</label>
                <input id="p-name" type="text" bind:value={name} placeholder="Your name" />
            </div>
            <div class="form-group">
                <label for="p-greeting">Greeting</label>
                <select id="p-greeting" bind:value={greeting}>
                    <option value="Good Morning">Good Morning</option>
                    <option value="Hello">Hello</option>
                    <option value="Hey">Hey</option>
                    <option value="Welcome back">Welcome back</option>
                </select>
            </div>
            <button class="save-btn" onclick={handleSave} disabled={saving}>
                {#if saved}
                    Saved!
                {:else if saving}
                    Saving...
                {:else}
                    Save Changes
                {/if}
            </button>
        </GlassCard>

        <!-- Logout -->
        <button class="logout-btn" onclick={handleLogout}>
            <i class="ri-logout-box-line"></i> Sign Out
        </button>
    {/if}

    <!-- App Info -->
    <GlassCard>
        <div class="app-info">
            <i class="ri-heart-3-fill" style="color: var(--accent-pink);"></i>
            <p>Use Up | Premium v1.0</p>
            <p class="app-desc">Track your product usage, set budgets, and complete challenges.</p>
        </div>
    </GlassCard>
</main>

<style>
    .avatar-section { text-align: center; margin-bottom: 24px; }
    .avatar {
        width: 80px; height: 80px; margin: 0 auto 12px;
        background: white; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 36px; color: var(--accent-pink);
        box-shadow: 0 8px 25px rgba(0,0,0,0.06);
        border: 3px solid rgba(255,255,255,0.9);
    }
    .avatar-name { font-size: 20px; font-weight: 600; }
    .avatar-email { font-size: 13px; color: var(--text-soft); margin-top: 4px; }
    .profile-stats { display: flex; justify-content: space-around; text-align: center; }
    .p-stat h3 { font-size: 24px; font-weight: 700; color: var(--text-dark); }
    .p-stat p { font-size: 11px; color: var(--text-soft); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text-soft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input, .form-group select {
        width: 100%; padding: 14px 16px; border: 1px solid rgba(0,0,0,0.06);
        border-radius: var(--radius-s); font-family: 'Poppins', sans-serif;
        font-size: 15px; background: rgba(255,255,255,0.8); color: var(--text-dark);
        outline: none; transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group select:focus { border-color: var(--accent-pink); }
    .save-btn {
        width: 100%; padding: 16px; border: none; border-radius: 50px;
        background: var(--primary-gradient); color: white;
        font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 600;
        cursor: pointer; box-shadow: 0 8px 25px rgba(255,107,129,0.3);
        transition: transform 0.2s, opacity 0.2s;
    }
    .save-btn:active { transform: scale(0.98); }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .logout-btn {
        width: 100%; padding: 16px; border: 1px solid rgba(0,0,0,0.06);
        border-radius: 50px; background: white; color: var(--text-soft);
        font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 500;
        cursor: pointer; margin-bottom: 24px; display: flex; align-items: center;
        justify-content: center; gap: 8px; transition: 0.2s;
    }
    .logout-btn:active { transform: scale(0.98); background: #f5f5f5; }
    .app-info { text-align: center; }
    .app-info i { font-size: 24px; margin-bottom: 8px; }
    .app-info p { font-size: 14px; font-weight: 500; }
    .app-desc { font-size: 12px; color: var(--text-soft); margin-top: 4px; }
</style>
