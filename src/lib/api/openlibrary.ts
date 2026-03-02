export interface ISBNResult {
	found: boolean;
	title: string;
	author: string | null;
	totalPages: number;
	coverUrl: string | null;
	isbn: string;
}

export async function lookupISBN(isbn: string): Promise<ISBNResult> {
	const fail: ISBNResult = { found: false, title: '', author: null, totalPages: 0, coverUrl: null, isbn };
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const res = await fetch(
			`https://openlibrary.org/isbn/${isbn}.json`,
			{
				signal: controller.signal,
				headers: { 'User-Agent': 'UseUp-App/1.0 (contact@useup.app)' },
			}
		);
		clearTimeout(timeout);

		if (!res.ok) return fail;

		const data = await res.json();
		const title = data.title || '';
		const totalPages = data.number_of_pages || 0;
		const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

		// Best-effort author fetch (3s timeout)
		let author: string | null = null;
		const authorKeys: { key: string }[] = data.authors || [];
		if (authorKeys.length > 0) {
			try {
				const ac = new AbortController();
				const at = setTimeout(() => ac.abort(), 3000);
				const authorRes = await fetch(
					`https://openlibrary.org${authorKeys[0].key}.json`,
					{ signal: ac.signal }
				);
				clearTimeout(at);
				if (authorRes.ok) {
					const authorData = await authorRes.json();
					author = authorData.name || null;
				}
			} catch {
				// Author fetch failed — not critical
			}
		}

		return { found: true, title, author, totalPages, coverUrl, isbn };
	} catch {
		return fail;
	}
}
