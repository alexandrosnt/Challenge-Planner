<script>
    let { greeting, name, city = '', temp = null, weatherIcon = '' } = $props();
</script>

<header>
    <div class="header-left">
        <p class="greeting">{greeting},</p>
        <h1>{name}</h1>
    </div>
    <div class="header-right">
        {#if city || temp !== null}
            <div class="weather-chip">
                {#if weatherIcon}
                    <i class={weatherIcon}></i>
                {/if}
                {#if temp !== null}
                    <span class="temp">{Math.round(temp)}°</span>
                {/if}
                {#if city}
                    <span class="city">{city}</span>
                {/if}
            </div>
        {/if}
        <a href="/profile" class="profile-btn" aria-label="Profile">
            <i class="ri-user-smile-line"></i>
        </a>
    </div>
</header>

<style>
    header {
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }

    .header-left {
        flex: 1;
        min-width: 0;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    .weather-chip {
        display: flex;
        align-items: center;
        gap: 5px;
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 50px;
        padding: 6px 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }

    .weather-chip i {
        font-size: 16px;
        color: var(--accent-pink);
    }

    .temp {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .city {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-soft);
        max-width: 70px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .profile-btn {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: var(--accent-pink);
        border: 2px solid rgba(255,255,255,0.8);
        text-decoration: none;
        flex-shrink: 0;
    }

    h1 {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

    .greeting {
        font-size: 14px;
        color: var(--text-soft);
        font-weight: 500;
    }
</style>
