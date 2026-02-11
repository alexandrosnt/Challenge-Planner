import en from './en';
import de from './de';

type DeepStringify<T> = {
	readonly [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
};
type Translations = DeepStringify<typeof en>;

const locales: Record<string, Translations> = { en, de };

export const t: Translations = $state({ ...en });

let _currentKey = 'en';

const STORAGE_KEY = 'useup_language';

export function setLocale(lang: string) {
	if (locales[lang]) {
		Object.assign(t, locales[lang]);
		_currentKey = lang;
		try {
			localStorage.setItem(STORAGE_KEY, lang);
		} catch {
			// localStorage unavailable
		}
	}
}

export function initLocale(): boolean {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && locales[saved]) {
			Object.assign(t, locales[saved]);
			_currentKey = saved;
			return true;
		}
	} catch {
		// localStorage unavailable
	}
	return false;
}

export function getLocale(): string {
	return _currentKey;
}
