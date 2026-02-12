export interface BarcodeResult {
	found: boolean;
	name: string;
	brand: string | null;
	categoryId: number | null;
	barcode: string;
}

const CATEGORY_KEYWORDS: Record<string, number> = {
	// Beauty (1)
	beauty: 1, cosmetic: 1, skin: 1, hair: 1, makeup: 1, fragrance: 1,
	perfume: 1, shampoo: 1, conditioner: 1, lotion: 1, cream: 1, serum: 1,
	// Health (2)
	health: 2, medicine: 2, supplement: 2, vitamin: 2, pharmacy: 2,
	// Home (3)
	home: 3, household: 3, cleaning: 3, detergent: 3, laundry: 3,
	// Electronics (4)
	electronic: 4, battery: 4, cable: 4,
	// Food & Pantry (5)
	food: 5, snack: 5, beverage: 5, dairy: 5, meat: 5, bread: 5,
	cereal: 5, pasta: 5, sauce: 5, chocolate: 5, candy: 5, drink: 5,
	juice: 5, coffee: 5, tea: 5, spice: 5, oil: 5, flour: 5, sugar: 5,
	// Stationery (6)
	stationery: 6, pen: 6, pencil: 6, paper: 6, notebook: 6,
};

function matchCategory(categoryTags: string[]): number | null {
	const joined = categoryTags.join(' ').toLowerCase();
	for (const [keyword, catId] of Object.entries(CATEGORY_KEYWORDS)) {
		if (joined.includes(keyword)) return catId;
	}
	return null;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeResult> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const res = await fetch(
			`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,categories_tags`,
			{
				signal: controller.signal,
				headers: { 'User-Agent': 'UseUp-App/1.0 (contact@useup.app)' },
			}
		);
		clearTimeout(timeout);

		if (!res.ok) {
			return { found: false, name: barcode, brand: null, categoryId: null, barcode };
		}

		const data = await res.json();
		if (data.status !== 1 || !data.product) {
			return { found: false, name: barcode, brand: null, categoryId: null, barcode };
		}

		const product = data.product;
		const productName = product.product_name || '';
		const brand = product.brands || null;
		const categoryTags: string[] = product.categories_tags || [];

		const displayName = brand && productName
			? `${brand} ${productName}`
			: productName || brand || barcode;

		const categoryId = matchCategory(categoryTags);

		return {
			found: true,
			name: displayName,
			brand,
			categoryId,
			barcode,
		};
	} catch {
		return { found: false, name: barcode, brand: null, categoryId: null, barcode };
	}
}
