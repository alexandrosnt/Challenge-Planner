<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { login, register } from '$lib/stores/auth.svelte';

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
            error = 'Please fill in all required fields.';
            return;
        }

        if (isRegister) {
            if (!displayName.trim()) {
                error = 'Please enter a display name.';
                return;
            }
            if (password !== confirmPassword) {
                error = 'Passwords do not match.';
                return;
            }
            if (password.length < 6) {
                error = 'Password must be at least 6 characters.';
                return;
            }
        }

        submitting = true;

        try {
            if (isRegister) {
                const result = await register(displayName.trim(), email.trim(), password);
                if (!result.success) {
                    error = result.error || 'Registration failed.';
                }
            } else {
                const result = await login(email.trim(), password);
                if (!result.success) {
                    error = result.error || 'Login failed.';
                }
            }
        } catch {
            error = 'An unexpected error occurred.';
        } finally {
            submitting = false;
        }
    }
</script>

<GlassCard>
    <h2 class="form-title">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
    <p class="form-subtitle">{isRegister ? 'Sign up to get started' : 'Sign in to continue'}</p>

    {#if error}
        <p class="error-message">{error}</p>
    {/if}

    {#if isRegister}
        <div class="form-group">
            <label for="login-display-name">Display Name</label>
            <input
                id="login-display-name"
                type="text"
                bind:value={displayName}
                placeholder="Your name"
            />
        </div>
    {/if}

    <div class="form-group">
        <label for="login-email">Email</label>
        <input
            id="login-email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
        />
    </div>

    <div class="form-group">
        <label for="login-password">Password</label>
        <input
            id="login-password"
            type="password"
            bind:value={password}
            placeholder="Enter password"
        />
    </div>

    {#if isRegister}
        <div class="form-group">
            <label for="login-confirm-password">Confirm Password</label>
            <input
                id="login-confirm-password"
                type="password"
                bind:value={confirmPassword}
                placeholder="Confirm password"
            />
        </div>
    {/if}

    <button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
        {#if submitting}
            {isRegister ? 'Creating Account...' : 'Signing In...'}
        {:else}
            {isRegister ? 'Create Account' : 'Sign In'}
        {/if}
    </button>

    <p class="toggle-text">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}
        <button class="toggle-link" onclick={toggleMode}>
            {isRegister ? 'Sign In' : 'Create Account'}
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
