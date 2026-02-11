<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { login, register } from '$lib/stores/auth.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let mode = $state('login');
    let email = $state('');
    let password = $state('');
    let confirmPassword = $state('');
    let displayName = $state('');
    let error = $state('');
    let submitting = $state(false);

    let isRegister = $derived(mode === 'register');

    function resetForm() {
        email = '';
        password = '';
        confirmPassword = '';
        displayName = '';
        error = '';
    }

    function toggleMode() {
        mode = isRegister ? 'login' : 'register';
        resetForm();
    }

    async function handleSubmit() {
        error = '';

        if (!email.trim() || !password.trim()) {
            error = t.login.fillAllFields;
            return;
        }

        if (isRegister) {
            if (!displayName.trim()) {
                error = t.login.enterDisplayName;
                return;
            }
            if (password !== confirmPassword) {
                error = t.login.passwordsNoMatch;
                return;
            }
            if (password.length < 6) {
                error = t.login.passwordTooShort;
                return;
            }
        }

        submitting = true;

        try {
            if (isRegister) {
                const result = await register(displayName.trim(), email.trim(), password);
                if (!result.success) {
                    error = result.error || t.auth.registrationFailed;
                }
            } else {
                const result = await login(email.trim(), password);
                if (!result.success) {
                    error = result.error || t.auth.loginFailed;
                }
            }
        } catch {
            error = t.login.unexpectedError;
        } finally {
            submitting = false;
        }
    }
</script>

<GlassCard>
    <h2 class="form-title">{isRegister ? t.login.createAccount : t.login.welcomeBack}</h2>
    <p class="form-subtitle">{isRegister ? t.login.signUpToGetStarted : t.login.signInToContinue}</p>

    {#if error}
        <p class="error-message">{error}</p>
    {/if}

    {#if isRegister}
        <div class="form-group">
            <label for="login-display-name">{t.login.displayName}</label>
            <input
                id="login-display-name"
                type="text"
                bind:value={displayName}
                placeholder={t.login.yourName}
            />
        </div>
    {/if}

    <div class="form-group">
        <label for="login-email">{t.login.email}</label>
        <input
            id="login-email"
            type="email"
            bind:value={email}
            placeholder={t.login.emailPlaceholder}
        />
    </div>

    <div class="form-group">
        <label for="login-password">{t.login.password}</label>
        <input
            id="login-password"
            type="password"
            bind:value={password}
            placeholder={t.login.enterPassword}
        />
    </div>

    {#if isRegister}
        <div class="form-group">
            <label for="login-confirm-password">{t.login.confirmPassword}</label>
            <input
                id="login-confirm-password"
                type="password"
                bind:value={confirmPassword}
                placeholder={t.login.confirmPasswordPlaceholder}
            />
        </div>
    {/if}

    <button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
        {#if submitting}
            {isRegister ? t.login.creatingAccount : t.login.signingIn}
        {:else}
            {isRegister ? t.login.createAccount : t.login.signIn}
        {/if}
    </button>

    <p class="toggle-text">
        {isRegister ? t.login.alreadyHaveAccount : t.login.dontHaveAccount}
        <button class="toggle-link" onclick={toggleMode}>
            {isRegister ? t.login.signIn : t.login.createAccount}
        </button>
    </p>
</GlassCard>

<style>
    .form-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-dark);
        text-align: center;
        margin-bottom: 4px;
    }

    .form-subtitle {
        font-size: 14px;
        color: var(--text-soft);
        text-align: center;
        margin-bottom: 24px;
    }

    .error-message {
        color: var(--accent-pink);
        font-size: 13px;
        font-weight: 500;
        text-align: center;
        margin-bottom: 16px;
        padding: 10px 14px;
        background: rgba(255, 107, 129, 0.08);
        border-radius: var(--radius-s);
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-soft);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .form-group input {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: var(--radius-s);
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        background: rgba(255, 255, 255, 0.8);
        color: var(--text-dark);
        outline: none;
        transition: border-color 0.2s;
    }

    .form-group input:focus {
        border-color: var(--accent-pink);
    }

    .submit-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 50px;
        background: var(--primary-gradient);
        color: white;
        font-family: 'Poppins', sans-serif;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(255, 107, 129, 0.3);
        transition: transform 0.2s, opacity 0.2s;
        margin-top: 4px;
    }

    .submit-btn:active {
        transform: scale(0.98);
    }

    .submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .toggle-text {
        text-align: center;
        font-size: 14px;
        color: var(--text-soft);
        margin-top: 20px;
    }

    .toggle-link {
        background: none;
        border: none;
        color: var(--accent-pink);
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        text-decoration: underline;
    }

    .toggle-link:active {
        opacity: 0.7;
    }
</style>
