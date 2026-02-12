import { createUser, getUserByEmail, getUserById, seedUserAchievements } from '$lib/db/queries';
import { triggerSync } from '$lib/db/sync';
import { t } from '$lib/i18n/index.svelte';

let currentUser = $state<{ id: number; name: string; email: string } | null>(null);
let isAuthenticated = $state(false);
let isLoading = $state(true);

async function hashPassword(password: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(salt + password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function getAuthState() {
	return {
		get currentUser() { return currentUser; },
		get isAuthenticated() { return isAuthenticated; },
		get isLoading() { return isLoading; }
	};
}

export async function checkSession(): Promise<void> {
	isLoading = true;
	try {
		const session = localStorage.getItem('useup_session');
		if (session) {
			const parsed = JSON.parse(session);
			if (parsed.userId) {
				const user = await getUserById(parsed.userId);
				if (user && user.email === parsed.email) {
					currentUser = { id: user.id, name: user.name, email: user.email };
					isAuthenticated = true;
				}
			}
		}
	} catch {
		// Session invalid
	} finally {
		isLoading = false;
	}
}

export async function register(
	name: string,
	email: string,
	password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const existing = await getUserByEmail(email);
		if (existing) {
			return { success: false, error: t.auth.emailExists };
		}

		const salt = generateSalt();
		const hash = await hashPassword(password, salt);
		const storedHash = salt + ':' + hash;

		const userId = await createUser(name, email, storedHash);
		await seedUserAchievements(userId);

		currentUser = { id: userId, name, email };
		isAuthenticated = true;
		localStorage.setItem('useup_session', JSON.stringify({ email, userId }));

		// Force immediate sync so account data reaches Turso
		await triggerSync();

		return { success: true };
	} catch (e) {
		return { success: false, error: t.auth.registrationFailed };
	}
}

export async function login(
	email: string,
	password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const user = await getUserByEmail(email);
		if (!user || !user.password_hash) {
			return { success: false, error: t.auth.invalidCredentials };
		}

		const [salt, storedHash] = user.password_hash.split(':');
		const inputHash = await hashPassword(password, salt);

		if (inputHash !== storedHash) {
			return { success: false, error: t.auth.invalidCredentials };
		}

		currentUser = { id: user.id, name: user.name, email: user.email };
		isAuthenticated = true;
		localStorage.setItem('useup_session', JSON.stringify({ email: user.email, userId: user.id }));

		return { success: true };
	} catch {
		return { success: false, error: t.auth.loginFailed };
	}
}

export function logout(): void {
	currentUser = null;
	isAuthenticated = false;
	localStorage.removeItem('useup_session');
}
