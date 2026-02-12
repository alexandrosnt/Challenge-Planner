import { getDb } from './client';
import { CREATE_TABLES, SEED_DATA, SEED_SUBCATEGORIES, ACHIEVEMENT_DEFINITIONS, USER_ID_INDEXES } from './schema';
import type { InStatement } from './client';

const CURRENT_SCHEMA_VERSION = 6;

// --- Helpers ---

function splitStatements(sql: string): string[] {
	return sql
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

// --- Initialization ---

export async function initializeDatabase(): Promise<void> {
	const db = getDb();

	// 1. Check if schema is already up to date (1 round-trip)
	let currentVersion = 0;
	try {
		const vResult = await db.execute(
			`SELECT MAX(version) as v FROM schema_version`
		);
		currentVersion = (vResult.rows[0]?.v as number) ?? 0;
	} catch {
		// schema_version table doesn't exist yet — need full init
	}

	// Even if version says 4, verify user_id columns actually exist
	if (currentVersion >= CURRENT_SCHEMA_VERSION) {
		try {
			await db.execute("SELECT user_id FROM items LIMIT 0");
			return; // columns exist, truly up to date
		} catch {
			// Version says 4 but columns missing — need to re-run migration
		}
	}

	// 2. Create tables — run individually so existing-table no-ops don't block new tables
	const createStmts: InStatement[] = splitStatements(CREATE_TABLES);
	await Promise.allSettled(createStmts.map(stmt => db.execute(stmt)));

	// 3. Batch migrations — ALTER TABLE can't be batched if one fails,
	//    so try them individually but in parallel
	const alterStatements = [
		"ALTER TABLE user_profile ADD COLUMN email TEXT",
		"ALTER TABLE user_profile ADD COLUMN password_hash TEXT",
		"ALTER TABLE user_profile ADD COLUMN avatar_url TEXT",
		"ALTER TABLE items ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)",
		"ALTER TABLE items ADD COLUMN purchase_price REAL",
		"ALTER TABLE items ADD COLUMN purchase_date TEXT",
		"ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1",
		"ALTER TABLE items ADD COLUMN notes TEXT",
		"ALTER TABLE budgets ADD COLUMN carryover INTEGER NOT NULL DEFAULT 0",
		"ALTER TABLE budgets ADD COLUMN carryover_amount REAL NOT NULL DEFAULT 0",
		// v4: add user_id columns
		"ALTER TABLE items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE challenges ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE budgets ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE purchases ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE usage_log ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE declutter_log ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE wishlist ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
		"ALTER TABLE streaks ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
	];
	await Promise.allSettled(alterStatements.map(sql => db.execute(sql)));

	// v4: Recreate achievements table with UNIQUE(key, user_id) instead of UNIQUE(key)
	try {
		await db.execute("SELECT user_id FROM achievements LIMIT 0");
		// Column exists — table already has new schema
	} catch {
		try {
			await db.execute(`CREATE TABLE IF NOT EXISTS achievements_v4 (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key TEXT NOT NULL,
				title TEXT NOT NULL,
				description TEXT NOT NULL,
				icon TEXT NOT NULL,
				unlocked INTEGER NOT NULL DEFAULT 0,
				unlocked_at TEXT,
				user_id INTEGER NOT NULL DEFAULT 1,
				UNIQUE(key, user_id)
			)`);
			await db.execute(`INSERT OR IGNORE INTO achievements_v4 (id, key, title, description, icon, unlocked, unlocked_at, user_id)
				SELECT id, key, title, description, icon, unlocked, unlocked_at, 1 FROM achievements`);
			await db.execute(`DROP TABLE achievements`);
			await db.execute(`ALTER TABLE achievements_v4 RENAME TO achievements`);
		} catch { /* already migrated or fresh install */ }
	}

	// v4: Recreate monthly_stats table with UNIQUE(month, user_id) instead of UNIQUE(month)
	try {
		await db.execute("SELECT user_id FROM monthly_stats LIMIT 0");
	} catch {
		try {
			await db.execute(`CREATE TABLE IF NOT EXISTS monthly_stats_v4 (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				month TEXT NOT NULL,
				empty_items INTEGER NOT NULL DEFAULT 0,
				total_saved REAL NOT NULL DEFAULT 0,
				budget_percentage REAL NOT NULL DEFAULT 0,
				user_id INTEGER NOT NULL DEFAULT 1,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				UNIQUE(month, user_id)
			)`);
			await db.execute(`INSERT OR IGNORE INTO monthly_stats_v4 (id, month, empty_items, total_saved, budget_percentage, user_id, created_at)
				SELECT id, month, empty_items, total_saved, budget_percentage, 1, created_at FROM monthly_stats`);
			await db.execute(`DROP TABLE monthly_stats`);
			await db.execute(`ALTER TABLE monthly_stats_v4 RENAME TO monthly_stats`);
		} catch { /* already migrated or fresh install */ }
	}

	// v6: Add name column to budgets (safe ALTER TABLE — no DROP)
	if (currentVersion < 6) {
		// Recovery: if a previous broken migration left budgets_v6 but dropped budgets
		try {
			await db.execute("SELECT 1 FROM budgets LIMIT 0");
		} catch {
			// budgets table missing — check for leftover budgets_v6 from failed migration
			try {
				await db.execute("SELECT 1 FROM budgets_v6 LIMIT 0");
				await db.execute("ALTER TABLE budgets_v6 RENAME TO budgets");
			} catch {
				// Neither table exists — CREATE_TABLES above already created it
			}
		}
		// Now safely add the name column if missing
		try {
			await db.execute("ALTER TABLE budgets ADD COLUMN name TEXT");
		} catch { /* column already exists */ }
	}

	// v4: Migrate existing user_profile to users table if registered
	try {
		const profile = await db.execute("SELECT * FROM user_profile WHERE id = 1 AND email IS NOT NULL AND email != ''");
		if (profile.rows.length > 0) {
			const row = profile.rows[0];
			await db.execute({
				sql: `INSERT OR IGNORE INTO users (name, email, password_hash, greeting, avatar_url)
					VALUES (?, ?, ?, ?, ?)`,
				args: [
					row.name as string,
					row.email as string,
					(row.password_hash as string) || 'migrated',
					(row.greeting as string) || 'Good Morning',
					(row.avatar_url as string) ?? null
				]
			});
			// Seed achievements for migrated user
			const migratedUser = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [row.email as string] });
			if (migratedUser.rows.length > 0) {
				const userId = migratedUser.rows[0].id as number;
				// Update all existing data to point to this user
				const updateTables = [
					'items', 'challenges', 'budgets', 'purchases',
					'usage_log', 'declutter_log', 'wishlist', 'streaks',
					'achievements', 'monthly_stats'
				];
				await Promise.allSettled(
					updateTables.map(table =>
						db.execute({ sql: `UPDATE ${table} SET user_id = ? WHERE user_id = 1`, args: [userId] })
					)
				);
			}
		}
	} catch { /* no user_profile or migration already done */ }

	// 4. Batch core seed data (1 round-trip) — categories only, no achievements
	const coreSeeds: InStatement[] = splitStatements(SEED_DATA);
	await db.batch(coreSeeds, 'write');

	// 5. Subcategories separately — FK may fail if category IDs don't match
	try {
		await db.batch(splitStatements(SEED_SUBCATEGORIES), 'write');
	} catch { /* FK mismatch on existing DB — safe to skip */ }

	// 6. Create user_id indexes in a single batch (1 round-trip)
	const indexStmts: InStatement[] = splitStatements(USER_ID_INDEXES);
	await db.batch(indexStmts, 'write');

	// 7. Mark schema version (1 round-trip)
	await db.execute({
		sql: 'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
		args: [CURRENT_SCHEMA_VERSION]
	});
}

// --- Interfaces ---

export interface User {
	id: number;
	name: string;
	email: string;
	greeting: string;
	avatar_url: string | null;
}

export interface UserProfile {
	id: number;
	name: string;
	greeting: string;
	email: string | null;
	password_hash: string | null;
	avatar_url: string | null;
}

export interface Category {
	id: number;
	name: string;
	icon: string;
}

export interface Subcategory {
	id: number;
	name: string;
	category_id: number;
	icon: string | null;
}

export interface Item {
	id: number;
	name: string;
	category_id: number;
	subcategory_id: number | null;
	status: string;
	purchase_price: number | null;
	purchase_date: string | null;
	quantity: number;
	notes: string | null;
	used_up_at: string | null;
	created_at: string;
	category_name?: string;
	category_icon?: string;
	subcategory_name?: string;
	usage_count?: number;
	cost_per_use?: number | null;
}

export interface Challenge {
	id: number;
	title: string;
	icon: string;
	tag: string;
	total: number;
	completed: number;
	deadline: string | null;
	category_id: number | null;
}

export interface Budget {
	id: number;
	name: string | null;
	category_id: number | null;
	monthly_limit: number;
	spent: number;
	month: string;
	carryover: number;
	carryover_amount: number;
	display_name: string;
	category_name?: string;
	category_icon?: string;
	actual_spent?: number;
}

export interface Purchase {
	id: number;
	item_id: number | null;
	category_id: number;
	subcategory_id: number | null;
	name: string;
	amount: number;
	purchase_date: string;
	notes: string | null;
	feeling: string | null;
	created_at: string;
	category_name?: string;
}

export interface UsageLogEntry {
	id: number;
	item_id: number;
	used_at: string;
	notes: string | null;
	item_name?: string;
}

export interface DeclutterEntry {
	id: number;
	item_id: number;
	reason: string | null;
	method: string;
	amount_recovered: number;
	created_at: string;
	item_name?: string;
}

export interface WishlistItem {
	id: number;
	name: string;
	category_id: number | null;
	subcategory_id: number | null;
	estimated_price: number | null;
	added_at: string;
	wait_until: string | null;
	purchased: number;
	notes: string | null;
	days_remaining?: number;
	category_name?: string;
}

export interface Streak {
	id: number;
	category_id: number | null;
	streak_type: string;
	start_date: string;
	last_active_date: string;
	current_count: number;
	best_count: number;
	active: number;
	category_name?: string;
	category_icon?: string;
}

export interface Achievement {
	id: number;
	key: string;
	title: string;
	description: string;
	icon: string;
	unlocked: number;
	unlocked_at: string | null;
}

export interface MonthlyStats {
	empty_items: number;
	total_saved: number;
	budget_percentage: number;
}

export interface ComputedStats {
	active_items: number;
	used_up_items: number;
	decluttered_items: number;
	total_items: number;
	total_spent_this_month: number;
	total_budget_limit: number;
	budget_percentage: number;
	total_saved: number;
	total_usage_count: number;
	longest_streak: number;
}

// --- User CRUD ---

export async function createUser(name: string, email: string, passwordHash: string): Promise<number> {
	const db = getDb();
	const result = await db.execute({
		sql: 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
		args: [name, email, passwordHash]
	});
	return Number(result.lastInsertRowid);
}

export async function getUserByEmail(email: string): Promise<{ id: number; name: string; email: string; password_hash: string; greeting: string; avatar_url: string | null } | null> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT * FROM users WHERE email = ?',
		args: [email]
	});
	if (result.rows.length === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id as number,
		name: row.name as string,
		email: row.email as string,
		password_hash: row.password_hash as string,
		greeting: (row.greeting as string) ?? 'Good Morning',
		avatar_url: (row.avatar_url as string) ?? null
	};
}

export async function getUserById(userId: number): Promise<User | null> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT id, name, email, greeting, avatar_url FROM users WHERE id = ?',
		args: [userId]
	});
	if (result.rows.length === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id as number,
		name: row.name as string,
		email: row.email as string,
		greeting: (row.greeting as string) ?? 'Good Morning',
		avatar_url: (row.avatar_url as string) ?? null
	};
}

export async function seedUserAchievements(userId: number): Promise<void> {
	const db = getDb();
	await db.batch(
		ACHIEVEMENT_DEFINITIONS.map(a => ({
			sql: 'INSERT OR IGNORE INTO achievements (key, title, description, icon, user_id) VALUES (?, ?, ?, ?, ?)',
			args: [a.key, a.title, a.description, a.icon, userId]
		})),
		'write'
	);
}

// --- User Profile (reads from users table) ---

export async function getUserProfile(userId: number): Promise<User> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT id, name, email, greeting, avatar_url FROM users WHERE id = ?',
		args: [userId]
	});
	const row = result.rows[0];
	return {
		id: row.id as number,
		name: row.name as string,
		email: row.email as string,
		greeting: (row.greeting as string) ?? 'Good Morning',
		avatar_url: (row.avatar_url as string) ?? null
	};
}

export async function updateUserProfile(userId: number, name: string, greeting: string): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE users SET name = ?, greeting = ? WHERE id = ?',
		args: [name, greeting, userId]
	});
}

export async function updateUserEmail(userId: number, email: string): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE users SET email = ? WHERE id = ?',
		args: [email, userId]
	});
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
		args: [passwordHash, userId]
	});
}

// --- Categories (global, no userId) ---

export async function getCategories(): Promise<Category[]> {
	const db = getDb();
	const result = await db.execute('SELECT * FROM categories ORDER BY id');
	return result.rows.map((row) => ({
		id: row.id as number,
		name: row.name as string,
		icon: row.icon as string
	}));
}

export async function addCategory(name: string, icon: string): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO categories (name, icon) VALUES (?, ?)',
		args: [name, icon]
	});
}

// --- Subcategories (global, no userId) ---

export async function getSubcategories(categoryId?: number): Promise<Subcategory[]> {
	const db = getDb();
	let sql = 'SELECT * FROM subcategories';
	const args: (string | number)[] = [];

	if (categoryId) {
		sql += ' WHERE category_id = ?';
		args.push(categoryId);
	}

	sql += ' ORDER BY name';
	const result = await db.execute({ sql, args });
	return result.rows.map((row) => ({
		id: row.id as number,
		name: row.name as string,
		category_id: row.category_id as number,
		icon: (row.icon as string) ?? null
	}));
}

export async function addSubcategory(
	name: string,
	categoryId: number,
	icon?: string
): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES (?, ?, ?)',
		args: [name, categoryId, icon ?? null]
	});
}

// --- Items ---

export async function getItems(
	userId: number,
	categoryId?: number,
	subcategoryId?: number,
	status?: string
): Promise<Item[]> {
	const db = getDb();
	let sql = `SELECT i.*, c.name as category_name, c.icon as category_icon,
		sc.name as subcategory_name,
		(SELECT COUNT(*) FROM usage_log ul WHERE ul.item_id = i.id) as usage_count
		FROM items i
		JOIN categories c ON i.category_id = c.id
		LEFT JOIN subcategories sc ON i.subcategory_id = sc.id`;

	const conditions: string[] = ['i.user_id = ?'];
	const args: (string | number)[] = [userId];

	if (categoryId) {
		conditions.push('i.category_id = ?');
		args.push(categoryId);
	}
	if (subcategoryId) {
		conditions.push('i.subcategory_id = ?');
		args.push(subcategoryId);
	}
	if (status) {
		conditions.push('i.status = ?');
		args.push(status);
	}

	sql += ' WHERE ' + conditions.join(' AND ');
	sql += ' ORDER BY i.created_at DESC';
	const result = await db.execute({ sql, args });
	return result.rows.map((row) => {
		const usageCount = row.usage_count as number;
		const price = row.purchase_price as number | null;
		return {
			id: row.id as number,
			name: row.name as string,
			category_id: row.category_id as number,
			subcategory_id: (row.subcategory_id as number) ?? null,
			status: row.status as string,
			purchase_price: price,
			purchase_date: (row.purchase_date as string) ?? null,
			quantity: (row.quantity as number) ?? 1,
			notes: (row.notes as string) ?? null,
			used_up_at: (row.used_up_at as string) ?? null,
			created_at: row.created_at as string,
			category_name: row.category_name as string,
			category_icon: row.category_icon as string,
			subcategory_name: (row.subcategory_name as string) ?? undefined,
			usage_count: usageCount,
			cost_per_use: price && usageCount > 0 ? price / usageCount : null
		};
	});
}

export async function addItem(
	userId: number,
	name: string,
	categoryId: number,
	subcategoryId?: number | null,
	purchasePrice?: number | null,
	purchaseDate?: string | null,
	quantity?: number,
	notes?: string | null
): Promise<number> {
	const db = getDb();
	const result = await db.execute({
		sql: `INSERT INTO items (name, category_id, subcategory_id, purchase_price, purchase_date, quantity, notes, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			name,
			categoryId,
			subcategoryId ?? null,
			purchasePrice ?? null,
			purchaseDate ?? null,
			quantity ?? 1,
			notes ?? null,
			userId
		]
	});
	return Number(result.lastInsertRowid);
}

export async function updateItem(
	userId: number,
	id: number,
	updates: Partial<{
		name: string;
		category_id: number;
		subcategory_id: number | null;
		purchase_price: number | null;
		notes: string | null;
	}>
): Promise<void> {
	const db = getDb();
	const fields: string[] = [];
	const args: (string | number | null)[] = [];

	for (const [key, value] of Object.entries(updates)) {
		fields.push(`${key} = ?`);
		args.push(value as string | number | null);
	}

	if (fields.length === 0) return;
	args.push(id, userId);

	await db.execute({
		sql: `UPDATE items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
		args
	});
}

export async function deleteItem(userId: number, id: number): Promise<void> {
	const db = getDb();
	// Clean up all FK references before deleting the item
	await db.execute({
		sql: "DELETE FROM usage_log WHERE item_id = ? AND user_id = ?",
		args: [id, userId]
	});
	await db.execute({
		sql: "DELETE FROM declutter_log WHERE item_id = ? AND user_id = ?",
		args: [id, userId]
	});
	await db.execute({
		sql: "DELETE FROM pan_project_items WHERE item_id = ? AND user_id = ?",
		args: [id, userId]
	});
	await db.execute({
		sql: "UPDATE purchases SET item_id = NULL WHERE item_id = ? AND user_id = ?",
		args: [id, userId]
	});
	await db.execute({
		sql: "DELETE FROM items WHERE id = ? AND user_id = ?",
		args: [id, userId]
	});
}

export async function markItemUsedUp(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: "UPDATE items SET status = 'used_up', used_up_at = datetime('now') WHERE id = ? AND user_id = ?",
		args: [id, userId]
	});
}

export async function markItemDecluttered(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: "UPDATE items SET status = 'decluttered' WHERE id = ? AND user_id = ?",
		args: [id, userId]
	});
}

export async function getItemWithStats(userId: number, id: number): Promise<Item | null> {
	const db = getDb();
	const result = await db.execute({
		sql: `SELECT i.*, c.name as category_name, c.icon as category_icon,
			sc.name as subcategory_name,
			(SELECT COUNT(*) FROM usage_log ul WHERE ul.item_id = i.id) as usage_count
			FROM items i
			JOIN categories c ON i.category_id = c.id
			LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
			WHERE i.id = ? AND i.user_id = ?`,
		args: [id, userId]
	});

	if (result.rows.length === 0) return null;
	const row = result.rows[0];
	const usageCount = row.usage_count as number;
	const price = row.purchase_price as number | null;
	return {
		id: row.id as number,
		name: row.name as string,
		category_id: row.category_id as number,
		subcategory_id: (row.subcategory_id as number) ?? null,
		status: row.status as string,
		purchase_price: price,
		purchase_date: (row.purchase_date as string) ?? null,
		quantity: (row.quantity as number) ?? 1,
		notes: (row.notes as string) ?? null,
		used_up_at: (row.used_up_at as string) ?? null,
		created_at: row.created_at as string,
		category_name: row.category_name as string,
		category_icon: row.category_icon as string,
		subcategory_name: (row.subcategory_name as string) ?? undefined,
		usage_count: usageCount,
		cost_per_use: price && usageCount > 0 ? price / usageCount : null
	};
}

// --- Purchases ---

export async function addPurchase(
	userId: number,
	name: string,
	amount: number,
	categoryId: number,
	subcategoryId?: number | null,
	itemId?: number | null,
	purchaseDate?: string | null,
	notes?: string | null,
	feeling?: string | null
): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: `INSERT INTO purchases (name, amount, category_id, subcategory_id, item_id, purchase_date, notes, feeling, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			name,
			amount,
			categoryId,
			subcategoryId ?? null,
			itemId ?? null,
			purchaseDate ?? new Date().toISOString().slice(0, 10),
			notes ?? null,
			feeling ?? null,
			userId
		]
	});
}

export async function getPurchases(
	userId: number,
	categoryId?: number,
	month?: string
): Promise<Purchase[]> {
	const db = getDb();
	let sql = `SELECT p.*, c.name as category_name
		FROM purchases p JOIN categories c ON p.category_id = c.id`;
	const conditions: string[] = ['p.user_id = ?'];
	const args: (string | number)[] = [userId];

	if (categoryId) {
		conditions.push('p.category_id = ?');
		args.push(categoryId);
	}
	if (month) {
		conditions.push("strftime('%Y-%m', p.purchase_date) = ?");
		args.push(month);
	}

	sql += ' WHERE ' + conditions.join(' AND ');
	sql += ' ORDER BY p.purchase_date DESC, p.created_at DESC';
	const result = await db.execute({ sql, args });
	return result.rows.map((row) => ({
		id: row.id as number,
		item_id: (row.item_id as number) ?? null,
		category_id: row.category_id as number,
		subcategory_id: (row.subcategory_id as number) ?? null,
		name: row.name as string,
		amount: row.amount as number,
		purchase_date: row.purchase_date as string,
		notes: (row.notes as string) ?? null,
		feeling: (row.feeling as string) ?? null,
		created_at: row.created_at as string,
		category_name: row.category_name as string
	}));
}

export async function getTotalSpentThisMonth(userId: number, categoryId?: number): Promise<number> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);
	let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM purchases
		WHERE user_id = ? AND strftime('%Y-%m', purchase_date) = ?`;
	const args: (string | number)[] = [userId, currentMonth];

	if (categoryId) {
		sql += ' AND category_id = ?';
		args.push(categoryId);
	}

	const result = await db.execute({ sql, args });
	return result.rows[0].total as number;
}

export async function getLastPurchaseDate(userId: number, categoryId?: number): Promise<string | null> {
	const db = getDb();
	let sql = 'SELECT MAX(purchase_date) as last_date FROM purchases WHERE user_id = ?';
	const args: (string | number)[] = [userId];

	if (categoryId) {
		sql += ' AND category_id = ?';
		args.push(categoryId);
	}

	const result = await db.execute({ sql, args });
	return (result.rows[0]?.last_date as string) ?? null;
}

export async function getAllLastPurchaseDates(userId: number): Promise<Record<number, string>> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT category_id, MAX(purchase_date) as last_date FROM purchases WHERE user_id = ? GROUP BY category_id',
		args: [userId]
	});
	const map: Record<number, string> = {};
	for (const row of result.rows) {
		if (row.last_date) map[row.category_id as number] = row.last_date as string;
	}
	return map;
}

export async function updatePurchase(
	userId: number,
	id: number,
	updates: Partial<{
		name: string;
		amount: number;
		category_id: number;
		purchase_date: string;
		notes: string | null;
	}>
): Promise<void> {
	const db = getDb();
	const fields: string[] = [];
	const args: (string | number | null)[] = [];

	for (const [key, value] of Object.entries(updates)) {
		fields.push(`${key} = ?`);
		args.push(value as string | number | null);
	}

	if (fields.length === 0) return;
	args.push(id, userId);

	await db.execute({
		sql: `UPDATE purchases SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
		args
	});
}

export async function deletePurchase(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM purchases WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

// --- Usage Log ---

export async function logUsage(userId: number, itemId: number, notes?: string): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO usage_log (item_id, notes, user_id) VALUES (?, ?, ?)',
		args: [itemId, notes ?? null, userId]
	});
}

export async function getUsageLog(userId: number, itemId?: number, limit?: number): Promise<UsageLogEntry[]> {
	const db = getDb();
	let sql = `SELECT ul.*, i.name as item_name
		FROM usage_log ul JOIN items i ON ul.item_id = i.id`;
	const conditions: string[] = ['ul.user_id = ?'];
	const args: (string | number)[] = [userId];

	if (itemId) {
		conditions.push('ul.item_id = ?');
		args.push(itemId);
	}

	sql += ' WHERE ' + conditions.join(' AND ');
	sql += ' ORDER BY ul.used_at DESC';
	if (limit) {
		sql += ` LIMIT ${limit}`;
	}

	const result = await db.execute({ sql, args });
	return result.rows.map((row) => ({
		id: row.id as number,
		item_id: row.item_id as number,
		used_at: row.used_at as string,
		notes: (row.notes as string) ?? null,
		item_name: row.item_name as string
	}));
}

export async function getUsageCount(userId: number, itemId?: number): Promise<number> {
	const db = getDb();
	let sql = 'SELECT COUNT(*) as count FROM usage_log WHERE user_id = ?';
	const args: (string | number)[] = [userId];
	if (itemId) {
		sql += ' AND item_id = ?';
		args.push(itemId);
	}
	const result = await db.execute({ sql, args });
	return result.rows[0].count as number;
}

// --- Declutter ---

export async function logDeclutter(
	userId: number,
	itemId: number,
	method: string,
	reason?: string,
	amountRecovered?: number
): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO declutter_log (item_id, method, reason, amount_recovered, user_id) VALUES (?, ?, ?, ?, ?)',
		args: [itemId, method, reason ?? null, amountRecovered ?? 0, userId]
	});
	await markItemDecluttered(userId, itemId);
}

export async function getDeclutterLog(userId: number, limit?: number): Promise<DeclutterEntry[]> {
	const db = getDb();
	let sql = `SELECT dl.*, i.name as item_name
		FROM declutter_log dl JOIN items i ON dl.item_id = i.id
		WHERE dl.user_id = ?
		ORDER BY dl.created_at DESC`;
	const args: (string | number)[] = [userId];
	if (limit) {
		sql += ` LIMIT ${limit}`;
	}
	const result = await db.execute({ sql, args });
	return result.rows.map((row) => ({
		id: row.id as number,
		item_id: row.item_id as number,
		reason: (row.reason as string) ?? null,
		method: row.method as string,
		amount_recovered: row.amount_recovered as number,
		created_at: row.created_at as string,
		item_name: row.item_name as string
	}));
}

// --- Wishlist ---

export async function addWishlistItem(
	userId: number,
	name: string,
	categoryId?: number | null,
	subcategoryId?: number | null,
	estimatedPrice?: number | null,
	notes?: string | null
): Promise<void> {
	const db = getDb();
	const waitUntil = new Date();
	waitUntil.setDate(waitUntil.getDate() + 30);
	const waitUntilStr = waitUntil.toISOString().slice(0, 10);

	await db.execute({
		sql: `INSERT INTO wishlist (name, category_id, subcategory_id, estimated_price, wait_until, notes, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [name, categoryId ?? null, subcategoryId ?? null, estimatedPrice ?? null, waitUntilStr, notes ?? null, userId]
	});
}

export async function getWishlist(userId: number): Promise<WishlistItem[]> {
	const db = getDb();
	const result = await db.execute({
		sql: `SELECT w.*, c.name as category_name
		FROM wishlist w LEFT JOIN categories c ON w.category_id = c.id
		WHERE w.purchased = 0 AND w.user_id = ?
		ORDER BY w.wait_until ASC`,
		args: [userId]
	});

	const today = new Date();
	return result.rows.map((row) => {
		const waitUntil = row.wait_until as string | null;
		let daysRemaining = 0;
		if (waitUntil) {
			const diff = new Date(waitUntil).getTime() - today.getTime();
			daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
		}
		return {
			id: row.id as number,
			name: row.name as string,
			category_id: (row.category_id as number) ?? null,
			subcategory_id: (row.subcategory_id as number) ?? null,
			estimated_price: (row.estimated_price as number) ?? null,
			added_at: row.added_at as string,
			wait_until: waitUntil,
			purchased: row.purchased as number,
			notes: (row.notes as string) ?? null,
			days_remaining: daysRemaining,
			category_name: (row.category_name as string) ?? undefined
		};
	});
}

export async function markWishlistPurchased(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE wishlist SET purchased = 1 WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

export async function deleteWishlistItem(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM wishlist WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

// --- Challenges ---

export async function getChallenges(userId: number): Promise<Challenge[]> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT * FROM challenges WHERE user_id = ? ORDER BY created_at DESC',
		args: [userId]
	});
	return result.rows.map((row) => ({
		id: row.id as number,
		title: row.title as string,
		icon: row.icon as string,
		tag: row.tag as string,
		total: row.total as number,
		completed: row.completed as number,
		deadline: (row.deadline as string) ?? null,
		category_id: (row.category_id as number) ?? null
	}));
}

export async function addChallenge(
	userId: number,
	title: string,
	total: number,
	icon?: string,
	deadline?: string | null,
	categoryId?: number | null
): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO challenges (title, total, icon, deadline, category_id, user_id) VALUES (?, ?, ?, ?, ?, ?)',
		args: [title, total, icon ?? 'ri-trophy-line', deadline ?? null, categoryId ?? null, userId]
	});
}

export async function updateChallengeProgress(userId: number, id: number, completed: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE challenges SET completed = ? WHERE id = ? AND user_id = ?',
		args: [completed, id, userId]
	});
}

// --- Budgets ---

export async function getBudgets(userId: number, month?: string): Promise<Budget[]> {
	const db = getDb();
	const currentMonth = month || new Date().toISOString().slice(0, 7);
	const result = await db.execute({
		sql: `SELECT b.*, c.name as category_name, c.icon as category_icon,
			COALESCE(b.name, c.name, 'Budget') as display_name
			FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
			WHERE b.month = ? AND b.user_id = ? ORDER BY b.id`,
		args: [currentMonth, userId]
	});
	return result.rows.map((row) => ({
		id: row.id as number,
		name: (row.name as string) ?? null,
		category_id: (row.category_id as number) ?? null,
		monthly_limit: row.monthly_limit as number,
		spent: row.spent as number,
		month: row.month as string,
		carryover: (row.carryover as number) ?? 0,
		carryover_amount: (row.carryover_amount as number) ?? 0,
		display_name: row.display_name as string,
		category_name: (row.category_name as string) ?? undefined,
		category_icon: (row.category_icon as string) ?? undefined
	}));
}

export async function getBudgetWithSpending(userId: number, month?: string): Promise<Budget[]> {
	const db = getDb();
	const currentMonth = month || new Date().toISOString().slice(0, 7);
	const result = await db.execute({
		sql: `SELECT b.*, c.name as category_name, c.icon as category_icon,
			COALESCE(b.name, c.name, 'Budget') as display_name,
			COALESCE((SELECT SUM(p.amount) FROM purchases p
				WHERE p.category_id = b.category_id AND p.user_id = ?
				AND strftime('%Y-%m', p.purchase_date) = b.month), 0) as actual_spent
			FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
			WHERE b.month = ? AND b.user_id = ? ORDER BY b.id`,
		args: [userId, currentMonth, userId]
	});
	return result.rows.map((row) => ({
		id: row.id as number,
		name: (row.name as string) ?? null,
		category_id: (row.category_id as number) ?? null,
		monthly_limit: row.monthly_limit as number,
		spent: row.spent as number,
		month: row.month as string,
		carryover: (row.carryover as number) ?? 0,
		carryover_amount: (row.carryover_amount as number) ?? 0,
		display_name: row.display_name as string,
		category_name: (row.category_name as string) ?? undefined,
		category_icon: (row.category_icon as string) ?? undefined,
		actual_spent: row.actual_spent as number
	}));
}

export async function addBudget(
	userId: number,
	categoryId: number | null,
	monthlyLimit: number,
	month?: string,
	carryover?: boolean,
	name?: string | null
): Promise<void> {
	const db = getDb();
	const m = month || new Date().toISOString().slice(0, 7);
	if (categoryId) {
		await db.execute({
			sql: 'INSERT INTO budgets (name, category_id, monthly_limit, month, carryover, user_id) VALUES (?, ?, ?, ?, ?, ?)',
			args: [name ?? null, categoryId, monthlyLimit, m, carryover ? 1 : 0, userId]
		});
	} else {
		// category_id may be NOT NULL on migrated databases — try without it first
		try {
			await db.execute({
				sql: 'INSERT INTO budgets (name, monthly_limit, month, carryover, user_id) VALUES (?, ?, ?, ?, ?)',
				args: [name ?? null, monthlyLimit, m, carryover ? 1 : 0, userId]
			});
		} catch {
			// NOT NULL constraint — fall back to category_id = 1 (first category)
			await db.execute({
				sql: 'INSERT INTO budgets (name, category_id, monthly_limit, month, carryover, user_id) VALUES (?, ?, ?, ?, ?, ?)',
				args: [name ?? null, 1, monthlyLimit, m, carryover ? 1 : 0, userId]
			});
		}
	}
}

export async function updateBudgetSpent(userId: number, id: number, spent: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE budgets SET spent = ? WHERE id = ? AND user_id = ?',
		args: [spent, id, userId]
	});
}

export async function rolloverBudgets(userId: number): Promise<void> {
	const db = getDb();
	const lastMonth = new Date();
	lastMonth.setMonth(lastMonth.getMonth() - 1);
	const lastMonthStr = lastMonth.toISOString().slice(0, 7);
	const currentMonth = new Date().toISOString().slice(0, 7);

	const result = await db.execute({
		sql: 'SELECT * FROM budgets WHERE month = ? AND carryover = 1 AND user_id = ?',
		args: [lastMonthStr, userId]
	});

	for (const row of result.rows) {
		const remaining = Math.max(0, (row.monthly_limit as number) - (row.spent as number));
		const existing = await db.execute({
			sql: 'SELECT id FROM budgets WHERE category_id = ? AND month = ? AND user_id = ?',
			args: [row.category_id as number, currentMonth, userId]
		});

		if (existing.rows.length === 0) {
			await db.execute({
				sql: `INSERT INTO budgets (name, category_id, monthly_limit, month, carryover, carryover_amount, user_id)
					VALUES (?, ?, ?, ?, 1, ?, ?)`,
				args: [(row.name as string) ?? null, (row.category_id as number) ?? null, row.monthly_limit as number, currentMonth, remaining, userId]
			});
		}
	}
}

// --- Streaks ---

export async function getStreaks(userId: number): Promise<Streak[]> {
	const db = getDb();
	const result = await db.execute({
		sql: `SELECT s.*, c.name as category_name, c.icon as category_icon
		FROM streaks s LEFT JOIN categories c ON s.category_id = c.id
		WHERE s.user_id = ?
		ORDER BY s.active DESC, s.current_count DESC`,
		args: [userId]
	});
	return result.rows.map((row) => ({
		id: row.id as number,
		category_id: (row.category_id as number) ?? null,
		streak_type: row.streak_type as string,
		start_date: row.start_date as string,
		last_active_date: row.last_active_date as string,
		current_count: row.current_count as number,
		best_count: row.best_count as number,
		active: row.active as number,
		category_name: (row.category_name as string) ?? undefined,
		category_icon: (row.category_icon as string) ?? undefined
	}));
}

export async function startStreak(userId: number, categoryId?: number | null): Promise<void> {
	const db = getDb();
	const today = new Date().toISOString().slice(0, 10);
	await db.execute({
		sql: `INSERT INTO streaks (category_id, streak_type, start_date, last_active_date, current_count, active, user_id)
			VALUES (?, 'no_buy', ?, ?, 1, 1, ?)`,
		args: [categoryId ?? null, today, today, userId]
	});
}

export async function checkAndUpdateNoBuyStreaks(userId: number): Promise<void> {
	const db = getDb();
	const today = new Date().toISOString().slice(0, 10);

	const activeStreaks = await db.execute({
		sql: "SELECT * FROM streaks WHERE active = 1 AND streak_type = 'no_buy' AND user_id = ?",
		args: [userId]
	});

	for (const row of activeStreaks.rows) {
		const lastActive = row.last_active_date as string;
		const diffMs = new Date(today).getTime() - new Date(lastActive).getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays >= 1) {
			const categoryId = row.category_id as number | null;
			let purchaseCheck;
			if (categoryId) {
				purchaseCheck = await db.execute({
					sql: `SELECT COUNT(*) as cnt FROM purchases
						WHERE category_id = ? AND purchase_date > ? AND user_id = ?`,
					args: [categoryId, lastActive, userId]
				});
			} else {
				purchaseCheck = await db.execute({
					sql: 'SELECT COUNT(*) as cnt FROM purchases WHERE purchase_date > ? AND user_id = ?',
					args: [lastActive, userId]
				});
			}

			const purchaseCount = purchaseCheck.rows[0].cnt as number;
			if (purchaseCount === 0) {
				const newCount = (row.current_count as number) + diffDays;
				const bestCount = Math.max(row.best_count as number, newCount);
				await db.execute({
					sql: 'UPDATE streaks SET current_count = ?, best_count = ?, last_active_date = ? WHERE id = ?',
					args: [newCount, bestCount, today, row.id as number]
				});
			} else {
				await db.execute({
					sql: 'UPDATE streaks SET active = 0 WHERE id = ?',
					args: [row.id as number]
				});
			}
		}
	}
}

// --- Achievements ---

export async function getAchievements(userId: number): Promise<Achievement[]> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked DESC, id ASC',
		args: [userId]
	});
	return result.rows.map((row) => ({
		id: row.id as number,
		key: row.key as string,
		title: row.title as string,
		description: row.description as string,
		icon: row.icon as string,
		unlocked: row.unlocked as number,
		unlocked_at: (row.unlocked_at as string) ?? null
	}));
}

export async function unlockAchievement(userId: number, key: string): Promise<boolean> {
	const db = getDb();
	const check = await db.execute({
		sql: 'SELECT unlocked FROM achievements WHERE key = ? AND user_id = ?',
		args: [key, userId]
	});
	if (check.rows.length === 0 || check.rows[0].unlocked === 1) return false;

	await db.execute({
		sql: "UPDATE achievements SET unlocked = 1, unlocked_at = datetime('now') WHERE key = ? AND user_id = ?",
		args: [key, userId]
	});
	return true;
}

export async function checkAchievements(userId: number): Promise<string[]> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);

	const results = await db.batch([
		{ sql: "SELECT COUNT(*) as cnt FROM items WHERE status = 'used_up' AND user_id = ?", args: [userId] },
		{ sql: 'SELECT MAX(best_count) as best FROM streaks WHERE user_id = ?', args: [userId] },
		{ sql: 'SELECT COUNT(*) as cnt FROM challenges WHERE completed >= total AND user_id = ?', args: [userId] },
		{ sql: 'SELECT COUNT(*) as cnt FROM usage_log WHERE user_id = ?', args: [userId] },
		{ sql: "SELECT COUNT(*) as cnt FROM wishlist WHERE wait_until <= date('now') AND purchased = 0 AND user_id = ?", args: [userId] },
		{ sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN spent <= monthly_limit THEN 1 ELSE 0 END) as under_budget FROM budgets WHERE month = ? AND user_id = ?', args: [currentMonth, userId] },
		{ sql: 'SELECT COUNT(*) as cnt FROM declutter_log WHERE user_id = ?', args: [userId] },
		{ sql: "SELECT key FROM achievements WHERE unlocked = 1 AND user_id = ?", args: [userId] }
	], 'read');

	const usedUpCount = (results[0].rows[0].cnt as number) ?? 0;
	const bestStreak = (results[1].rows[0].best as number) ?? 0;
	const completedChallenges = (results[2].rows[0].cnt as number) ?? 0;
	const totalUses = (results[3].rows[0].cnt as number) ?? 0;
	const waitedItems = (results[4].rows[0].cnt as number) ?? 0;
	const totalBudgets = (results[5].rows[0].total as number) ?? 0;
	const underBudget = (results[5].rows[0].under_budget as number) ?? 0;
	const declutterCount = (results[6].rows[0].cnt as number) ?? 0;

	const alreadyUnlocked = new Set(results[7].rows.map(r => r.key as string));

	const toUnlock: string[] = [];
	if (usedUpCount >= 1 && !alreadyUnlocked.has('first_use_up')) toUnlock.push('first_use_up');
	if (usedUpCount >= 10 && !alreadyUnlocked.has('ten_items_used')) toUnlock.push('ten_items_used');
	if (bestStreak >= 7 && !alreadyUnlocked.has('streak_7')) toUnlock.push('streak_7');
	if (bestStreak >= 30 && !alreadyUnlocked.has('streak_30')) toUnlock.push('streak_30');
	if (completedChallenges >= 1 && !alreadyUnlocked.has('first_challenge')) toUnlock.push('first_challenge');
	if (totalUses >= 50 && !alreadyUnlocked.has('fifty_uses')) toUnlock.push('fifty_uses');
	if (waitedItems >= 1 && !alreadyUnlocked.has('wishlist_wait')) toUnlock.push('wishlist_wait');
	if (declutterCount >= 1 && !alreadyUnlocked.has('first_declutter')) toUnlock.push('first_declutter');
	if (declutterCount >= 5 && !alreadyUnlocked.has('five_declutters')) toUnlock.push('five_declutters');
	if (totalBudgets > 0 && totalBudgets === underBudget && !alreadyUnlocked.has('budget_under')) toUnlock.push('budget_under');

	if (toUnlock.length > 0) {
		await db.batch(
			toUnlock.map(key => ({
				sql: "UPDATE achievements SET unlocked = 1, unlocked_at = datetime('now') WHERE key = ? AND user_id = ? AND unlocked = 0",
				args: [key, userId]
			}))
		);
	}

	return toUnlock;
}

// --- Computed Stats ---

export async function getComputedStats(userId: number): Promise<ComputedStats> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);

	const [itemCounts, spentResult, budgetResult, usageResult, streakResult] = await db.batch([
		{ sql: `SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'used_up' THEN 1 ELSE 0 END) as used_up,
			SUM(CASE WHEN status = 'decluttered' THEN 1 ELSE 0 END) as decluttered
			FROM items WHERE user_id = ?`, args: [userId] },
		{
			sql: `SELECT COALESCE(SUM(amount), 0) as total FROM purchases
				WHERE strftime('%Y-%m', purchase_date) = ? AND user_id = ?`,
			args: [currentMonth, userId]
		},
		{
			sql: `SELECT COALESCE(SUM(monthly_limit), 0) as total_limit,
				COALESCE(SUM(spent), 0) as total_spent FROM budgets WHERE month = ? AND user_id = ?`,
			args: [currentMonth, userId]
		},
		{ sql: 'SELECT COUNT(*) as cnt FROM usage_log WHERE user_id = ?', args: [userId] },
		{ sql: 'SELECT MAX(current_count) as longest FROM streaks WHERE active = 1 AND user_id = ?', args: [userId] }
	], 'read');

	const totalLimit = budgetResult.rows[0].total_limit as number;
	const totalSpent = spentResult.rows[0].total as number;
	const budgetPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
	const totalSaved = Math.max(0, totalLimit - totalSpent);

	return {
		active_items: (itemCounts.rows[0].active as number) ?? 0,
		used_up_items: (itemCounts.rows[0].used_up as number) ?? 0,
		decluttered_items: (itemCounts.rows[0].decluttered as number) ?? 0,
		total_items: (itemCounts.rows[0].total as number) ?? 0,
		total_spent_this_month: totalSpent,
		total_budget_limit: totalLimit,
		budget_percentage: budgetPct,
		total_saved: totalSaved,
		total_usage_count: (usageResult.rows[0].cnt as number) ?? 0,
		longest_streak: (streakResult.rows[0].longest as number) ?? 0
	};
}

// --- Monthly Stats (legacy) ---

export async function getMonthlyStats(userId: number): Promise<MonthlyStats> {
	const stats = await getComputedStats(userId);
	return {
		empty_items: stats.used_up_items,
		total_saved: stats.total_saved,
		budget_percentage: stats.budget_percentage
	};
}

export async function updateMonthlyStats(
	userId: number,
	emptyItems: number,
	totalSaved: number,
	budgetPercentage: number
): Promise<void> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);
	await db.execute({
		sql: `INSERT INTO monthly_stats (month, empty_items, total_saved, budget_percentage, user_id)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(month, user_id) DO UPDATE SET
				empty_items = excluded.empty_items,
				total_saved = excluded.total_saved,
				budget_percentage = excluded.budget_percentage`,
		args: [currentMonth, emptyItems, totalSaved, budgetPercentage, userId]
	});
}

// --- Activity Feed ---

export interface ActivityEntry {
	type: 'purchase' | 'usage' | 'declutter';
	description: string;
	timestamp: string;
	icon: string;
}

export async function getRecentActivity(userId: number, limit: number = 10): Promise<ActivityEntry[]> {
	const db = getDb();
	const [purchases, usages, declutters] = await db.batch([
		{
			sql: `SELECT p.name, p.amount, p.created_at as ts, c.icon as cat_icon
				FROM purchases p JOIN categories c ON p.category_id = c.id
				WHERE p.user_id = ?
				ORDER BY p.created_at DESC LIMIT ?`,
			args: [userId, limit]
		},
		{
			sql: `SELECT i.name, ul.used_at as ts
				FROM usage_log ul JOIN items i ON ul.item_id = i.id
				WHERE ul.user_id = ?
				ORDER BY ul.used_at DESC LIMIT ?`,
			args: [userId, limit]
		},
		{
			sql: `SELECT i.name, dl.method, dl.created_at as ts
				FROM declutter_log dl JOIN items i ON dl.item_id = i.id
				WHERE dl.user_id = ?
				ORDER BY dl.created_at DESC LIMIT ?`,
			args: [userId, limit]
		}
	], 'read');

	const entries: ActivityEntry[] = [];

	for (const row of purchases.rows) {
		entries.push({
			type: 'purchase',
			description: `Bought ${row.name} (${row.amount}\u20AC)`,
			timestamp: row.ts as string,
			icon: 'ri-shopping-bag-3-line'
		});
	}
	for (const row of usages.rows) {
		entries.push({
			type: 'usage',
			description: `Used ${row.name}`,
			timestamp: row.ts as string,
			icon: 'ri-check-line'
		});
	}
	for (const row of declutters.rows) {
		entries.push({
			type: 'declutter',
			description: `${row.method} ${row.name}`,
			timestamp: row.ts as string,
			icon: 'ri-delete-bin-line'
		});
	}

	entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	return entries.slice(0, limit);
}

// --- Batched Progress Page Load (1 round-trip) ---

export interface CategoryProgress {
	category_id: number;
	category_name: string;
	category_icon: string;
	total: number;
	used_up: number;
	active: number;
	decluttered: number;
}

export interface DeclutterBreakdown {
	donated: number;
	sold: number;
	gifted: number;
	trashed: number;
	total_recovered: number;
}

export interface DeclutterCandidate {
	id: number;
	name: string;
	category_id: number;
	category_name: string;
	category_icon: string;
	subcategory_name?: string;
	purchase_price: number | null;
	usage_count: number;
}

export interface DeclutteredItem {
	id: number;
	item_id: number;
	item_name: string;
	method: string;
	reason: string | null;
	amount_recovered: number;
	created_at: string;
	category_name: string;
	category_icon: string;
}

export interface DeclutterPageData {
	candidates: DeclutterCandidate[];
	decluttered: DeclutteredItem[];
	stats: DeclutterBreakdown;
}

export async function loadDeclutterPageData(userId: number): Promise<DeclutterPageData> {
	const db = getDb();
	const results = await db.batch([
		{
			sql: `SELECT i.id, i.name, i.category_id, i.purchase_price,
			c.name as category_name, c.icon as category_icon,
			sc.name as subcategory_name,
			(SELECT COUNT(*) FROM usage_log ul WHERE ul.item_id = i.id) as usage_count
			FROM items i
			JOIN categories c ON i.category_id = c.id
			LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
			WHERE i.status = 'active' AND i.user_id = ?
			ORDER BY c.name, i.name`,
			args: [userId]
		},
		{
			sql: `SELECT dl.id, dl.item_id, dl.method, dl.reason, dl.amount_recovered, dl.created_at,
			i.name as item_name, c.name as category_name, c.icon as category_icon
			FROM declutter_log dl
			JOIN items i ON dl.item_id = i.id
			JOIN categories c ON i.category_id = c.id
			WHERE dl.user_id = ?
			ORDER BY dl.created_at DESC`,
			args: [userId]
		},
		{
			sql: `SELECT
			SUM(CASE WHEN method = 'donated' THEN 1 ELSE 0 END) as donated,
			SUM(CASE WHEN method = 'sold' THEN 1 ELSE 0 END) as sold,
			SUM(CASE WHEN method = 'gifted' THEN 1 ELSE 0 END) as gifted,
			SUM(CASE WHEN method = 'trashed' THEN 1 ELSE 0 END) as trashed,
			COALESCE(SUM(amount_recovered), 0) as total_recovered
			FROM declutter_log WHERE user_id = ?`,
			args: [userId]
		}
	], 'read');

	const candidates: DeclutterCandidate[] = results[0].rows.map(r => ({
		id: r.id as number,
		name: r.name as string,
		category_id: r.category_id as number,
		category_name: r.category_name as string,
		category_icon: r.category_icon as string,
		subcategory_name: (r.subcategory_name as string) ?? undefined,
		purchase_price: (r.purchase_price as number) ?? null,
		usage_count: (r.usage_count as number) ?? 0
	}));

	const decluttered: DeclutteredItem[] = results[1].rows.map(r => ({
		id: r.id as number,
		item_id: r.item_id as number,
		item_name: r.item_name as string,
		method: r.method as string,
		reason: (r.reason as string) ?? null,
		amount_recovered: (r.amount_recovered as number) ?? 0,
		created_at: r.created_at as string,
		category_name: r.category_name as string,
		category_icon: r.category_icon as string
	}));

	const s = results[2].rows[0];
	const stats: DeclutterBreakdown = {
		donated: (s.donated as number) ?? 0,
		sold: (s.sold as number) ?? 0,
		gifted: (s.gifted as number) ?? 0,
		trashed: (s.trashed as number) ?? 0,
		total_recovered: (s.total_recovered as number) ?? 0
	};

	return { candidates, decluttered, stats };
}

export interface ProgressData {
	active_items: number;
	used_up_items: number;
	decluttered_items: number;
	total_items: number;
	total_usage_count: number;
	monthly_usage_count: number;
	challenges_completed: number;
	challenges_total: number;
	achievements_unlocked: number;
	achievements_total: number;
	best_streak: number;
	current_streak: number;
	total_saved: number;
	category_progress: CategoryProgress[];
	declutter: DeclutterBreakdown;
}

export async function loadProgressData(userId: number): Promise<ProgressData> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);

	const results = await db.batch([
		{ sql: `SELECT COUNT(*) as total,
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'used_up' THEN 1 ELSE 0 END) as used_up,
			SUM(CASE WHEN status = 'decluttered' THEN 1 ELSE 0 END) as decluttered
			FROM items WHERE user_id = ?`, args: [userId] },
		{ sql: `SELECT c.id as category_id, c.name as category_name, c.icon as category_icon,
			COUNT(i.id) as total,
			SUM(CASE WHEN i.status = 'used_up' THEN 1 ELSE 0 END) as used_up,
			SUM(CASE WHEN i.status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN i.status = 'decluttered' THEN 1 ELSE 0 END) as decluttered
			FROM categories c LEFT JOIN items i ON i.category_id = c.id AND i.user_id = ?
			GROUP BY c.id ORDER BY c.id`, args: [userId] },
		{ sql: 'SELECT COUNT(*) as cnt FROM usage_log WHERE user_id = ?', args: [userId] },
		{ sql: `SELECT COUNT(*) as cnt FROM usage_log
				WHERE strftime('%Y-%m', used_at) = ? AND user_id = ?`, args: [currentMonth, userId] },
		{ sql: `SELECT COUNT(*) as total,
			SUM(CASE WHEN completed >= total THEN 1 ELSE 0 END) as done
			FROM challenges WHERE user_id = ?`, args: [userId] },
		{ sql: `SELECT COUNT(*) as total,
			SUM(CASE WHEN unlocked = 1 THEN 1 ELSE 0 END) as unlocked
			FROM achievements WHERE user_id = ?`, args: [userId] },
		{ sql: 'SELECT COALESCE(MAX(best_count), 0) as best FROM streaks WHERE user_id = ?', args: [userId] },
		{ sql: 'SELECT COALESCE(MAX(current_count), 0) as current FROM streaks WHERE active = 1 AND user_id = ?', args: [userId] },
		{ sql: `SELECT COALESCE(SUM(monthly_limit), 0) as total_limit,
				COALESCE(SUM(spent), 0) as total_spent FROM budgets WHERE month = ? AND user_id = ?`, args: [currentMonth, userId] },
		{ sql: `SELECT
			SUM(CASE WHEN method = 'donated' THEN 1 ELSE 0 END) as donated,
			SUM(CASE WHEN method = 'sold' THEN 1 ELSE 0 END) as sold,
			SUM(CASE WHEN method = 'gifted' THEN 1 ELSE 0 END) as gifted,
			SUM(CASE WHEN method = 'trashed' THEN 1 ELSE 0 END) as trashed,
			COALESCE(SUM(amount_recovered), 0) as total_recovered
			FROM declutter_log WHERE user_id = ?`, args: [userId] }
	], 'read');

	const r0 = results[0].rows[0];
	const totalLimit = results[8].rows[0].total_limit as number;
	const totalSpent = results[8].rows[0].total_spent as number;

	const category_progress: CategoryProgress[] = results[1].rows
		.filter(r => (r.total as number) > 0)
		.map(r => ({
			category_id: r.category_id as number,
			category_name: r.category_name as string,
			category_icon: r.category_icon as string,
			total: r.total as number,
			used_up: (r.used_up as number) ?? 0,
			active: (r.active as number) ?? 0,
			decluttered: (r.decluttered as number) ?? 0
		}));

	return {
		active_items: (r0.active as number) ?? 0,
		used_up_items: (r0.used_up as number) ?? 0,
		decluttered_items: (r0.decluttered as number) ?? 0,
		total_items: (r0.total as number) ?? 0,
		total_usage_count: (results[2].rows[0].cnt as number) ?? 0,
		monthly_usage_count: (results[3].rows[0].cnt as number) ?? 0,
		challenges_completed: (results[4].rows[0].done as number) ?? 0,
		challenges_total: (results[4].rows[0].total as number) ?? 0,
		achievements_unlocked: (results[5].rows[0].unlocked as number) ?? 0,
		achievements_total: (results[5].rows[0].total as number) ?? 0,
		best_streak: results[6].rows[0].best as number,
		current_streak: results[7].rows[0].current as number,
		total_saved: Math.max(0, totalLimit - totalSpent),
		category_progress,
		declutter: {
			donated: (results[9].rows[0].donated as number) ?? 0,
			sold: (results[9].rows[0].sold as number) ?? 0,
			gifted: (results[9].rows[0].gifted as number) ?? 0,
			trashed: (results[9].rows[0].trashed as number) ?? 0,
			total_recovered: (results[9].rows[0].total_recovered as number) ?? 0
		}
	};
}

// --- Batched Home Page Load (1 round-trip for core data) ---

export interface HomeData {
	profile: User;
	categories: Category[];
	challenges: Challenge[];
	budgets: Budget[];
	stats: ComputedStats;
	streaks: Streak[];
	activity: ActivityEntry[];
	wishlist: WishlistItem[];
	items: Item[];
}

export async function loadHomeData(userId: number): Promise<HomeData> {
	const db = getDb();
	const currentMonth = new Date().toISOString().slice(0, 7);
	const activityLimit = 8;

	const results = await db.batch([
		// 0: user profile from users table
		{ sql: 'SELECT id, name, email, greeting, avatar_url FROM users WHERE id = ?', args: [userId] },
		// 1: categories (global)
		'SELECT * FROM categories ORDER BY id',
		// 2: challenges
		{ sql: 'SELECT * FROM challenges WHERE user_id = ? ORDER BY created_at DESC', args: [userId] },
		// 3: budgets
		{ sql: `SELECT b.*, c.name as category_name, c.icon as category_icon,
			COALESCE(b.name, c.name, 'Budget') as display_name
			FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
			WHERE b.month = ? AND b.user_id = ? ORDER BY b.id`, args: [currentMonth, userId] },
		// 4: stats - item counts
		{ sql: `SELECT COUNT(*) as total,
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'used_up' THEN 1 ELSE 0 END) as used_up,
			SUM(CASE WHEN status = 'decluttered' THEN 1 ELSE 0 END) as decluttered
			FROM items WHERE user_id = ?`, args: [userId] },
		// 5: stats - monthly spend
		{ sql: `SELECT COALESCE(SUM(amount), 0) as total FROM purchases
			WHERE strftime('%Y-%m', purchase_date) = ? AND user_id = ?`, args: [currentMonth, userId] },
		// 6: stats - budget totals
		{ sql: `SELECT COALESCE(SUM(monthly_limit), 0) as total_limit,
			COALESCE(SUM(spent), 0) as total_spent FROM budgets WHERE month = ? AND user_id = ?`, args: [currentMonth, userId] },
		// 7: stats - usage count
		{ sql: 'SELECT COUNT(*) as cnt FROM usage_log WHERE user_id = ?', args: [userId] },
		// 8: stats - longest streak
		{ sql: 'SELECT MAX(current_count) as longest FROM streaks WHERE active = 1 AND user_id = ?', args: [userId] },
		// 9: streaks
		{ sql: `SELECT s.*, c.name as category_name, c.icon as category_icon
			FROM streaks s LEFT JOIN categories c ON s.category_id = c.id
			WHERE s.user_id = ?
			ORDER BY s.active DESC, s.current_count DESC`, args: [userId] },
		// 10: activity - purchases
		{ sql: `SELECT p.name, p.amount, p.created_at as ts, c.icon as cat_icon
			FROM purchases p JOIN categories c ON p.category_id = c.id
			WHERE p.user_id = ?
			ORDER BY p.created_at DESC LIMIT ?`, args: [userId, activityLimit] },
		// 11: activity - usages
		{ sql: `SELECT i.name, ul.used_at as ts
			FROM usage_log ul JOIN items i ON ul.item_id = i.id
			WHERE ul.user_id = ?
			ORDER BY ul.used_at DESC LIMIT ?`, args: [userId, activityLimit] },
		// 12: activity - declutters
		{ sql: `SELECT i.name, dl.method, dl.created_at as ts
			FROM declutter_log dl JOIN items i ON dl.item_id = i.id
			WHERE dl.user_id = ?
			ORDER BY dl.created_at DESC LIMIT ?`, args: [userId, activityLimit] },
		// 13: wishlist
		{ sql: `SELECT w.*, c.name as category_name
			FROM wishlist w LEFT JOIN categories c ON w.category_id = c.id
			WHERE w.purchased = 0 AND w.user_id = ?
			ORDER BY w.wait_until ASC`, args: [userId] },
		// 14: items
		{ sql: `SELECT i.*, c.name as category_name, c.icon as category_icon,
			sc.name as subcategory_name,
			(SELECT COUNT(*) FROM usage_log ul WHERE ul.item_id = i.id) as usage_count
			FROM items i
			JOIN categories c ON i.category_id = c.id
			LEFT JOIN subcategories sc ON i.subcategory_id = sc.id
			WHERE i.user_id = ?
			ORDER BY i.created_at DESC`, args: [userId] }
	], 'read');

	// Parse profile
	const pRow = results[0].rows[0];
	const profile: User = {
		id: pRow.id as number, name: pRow.name as string, email: pRow.email as string,
		greeting: (pRow.greeting as string) ?? 'Good Morning',
		avatar_url: (pRow.avatar_url as string) ?? null
	};

	// Parse categories
	const categories: Category[] = results[1].rows.map(r => ({
		id: r.id as number, name: r.name as string, icon: r.icon as string
	}));

	// Parse challenges
	const challenges: Challenge[] = results[2].rows.map(r => ({
		id: r.id as number, title: r.title as string, icon: r.icon as string,
		tag: r.tag as string, total: r.total as number, completed: r.completed as number,
		deadline: (r.deadline as string) ?? undefined, category_id: (r.category_id as number) ?? undefined,
		created_at: r.created_at as string
	}));

	// Parse budgets
	const budgets: Budget[] = results[3].rows.map(r => ({
		id: r.id as number, name: (r.name as string) ?? null,
		category_id: (r.category_id as number) ?? null,
		monthly_limit: r.monthly_limit as number, spent: r.spent as number,
		month: r.month as string, carryover: (r.carryover as number) ?? 0,
		carryover_amount: (r.carryover_amount as number) ?? 0,
		display_name: (r.display_name as string) ?? 'Budget',
		category_name: (r.category_name as string) ?? undefined,
		category_icon: (r.category_icon as string) ?? undefined
	}));

	// Parse computed stats
	const totalLimit = results[6].rows[0].total_limit as number;
	const totalSpent = results[5].rows[0].total as number;
	const budgetPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
	const stats: ComputedStats = {
		active_items: (results[4].rows[0].active as number) ?? 0,
		used_up_items: (results[4].rows[0].used_up as number) ?? 0,
		decluttered_items: (results[4].rows[0].decluttered as number) ?? 0,
		total_items: (results[4].rows[0].total as number) ?? 0,
		total_spent_this_month: totalSpent, total_budget_limit: totalLimit,
		budget_percentage: budgetPct, total_saved: Math.max(0, totalLimit - totalSpent),
		total_usage_count: (results[7].rows[0].cnt as number) ?? 0,
		longest_streak: (results[8].rows[0].longest as number) ?? 0
	};

	// Parse streaks
	const streaks: Streak[] = results[9].rows.map(r => ({
		id: r.id as number, category_id: (r.category_id as number) ?? null,
		streak_type: r.streak_type as string, start_date: r.start_date as string,
		last_active_date: r.last_active_date as string, current_count: r.current_count as number,
		best_count: r.best_count as number, active: r.active as number,
		category_name: (r.category_name as string) ?? undefined,
		category_icon: (r.category_icon as string) ?? undefined
	}));

	// Parse activity
	const entries: ActivityEntry[] = [];
	for (const row of results[10].rows) {
		entries.push({ type: 'purchase', description: `Bought ${row.name} (${row.amount}\u20AC)`,
			timestamp: row.ts as string, icon: 'ri-shopping-bag-3-line' });
	}
	for (const row of results[11].rows) {
		entries.push({ type: 'usage', description: `Used ${row.name}`,
			timestamp: row.ts as string, icon: 'ri-check-line' });
	}
	for (const row of results[12].rows) {
		entries.push({ type: 'declutter', description: `${row.method} ${row.name}`,
			timestamp: row.ts as string, icon: 'ri-delete-bin-line' });
	}
	entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	const activity = entries.slice(0, activityLimit);

	// Parse wishlist
	const today = new Date();
	const wishlist: WishlistItem[] = results[13].rows.map(r => {
		const waitUntil = r.wait_until as string | null;
		let daysRemaining = 0;
		if (waitUntil) {
			const diff = new Date(waitUntil).getTime() - today.getTime();
			daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
		}
		return {
			id: r.id as number, name: r.name as string,
			category_id: (r.category_id as number) ?? null, subcategory_id: (r.subcategory_id as number) ?? null,
			estimated_price: (r.estimated_price as number) ?? null, added_at: r.added_at as string,
			wait_until: waitUntil, purchased: r.purchased as number, notes: (r.notes as string) ?? null,
			days_remaining: daysRemaining, category_name: (r.category_name as string) ?? undefined
		};
	});

	// Parse items
	const items: Item[] = results[14].rows.map(r => {
		const usageCount = r.usage_count as number;
		const price = r.purchase_price as number | null;
		return {
			id: r.id as number, name: r.name as string, category_id: r.category_id as number,
			subcategory_id: (r.subcategory_id as number) ?? null, status: r.status as string,
			purchase_price: price, purchase_date: (r.purchase_date as string) ?? null,
			quantity: (r.quantity as number) ?? 1, notes: (r.notes as string) ?? null,
			used_up_at: (r.used_up_at as string) ?? null, created_at: r.created_at as string,
			category_name: r.category_name as string, category_icon: r.category_icon as string,
			subcategory_name: (r.subcategory_name as string) ?? undefined,
			usage_count: usageCount, cost_per_use: price && usageCount > 0 ? price / usageCount : null
		};
	});

	return { profile, categories, challenges, budgets, stats, streaks, activity, wishlist, items };
}

// --- Pan Project ---

export interface PanProjectItem {
	id: number;
	item_id: number;
	quantity: number;
	emptied: number;
	created_at: string;
	item_name: string;
	category_name: string;
	category_icon: string;
}

export interface PanProjectStats {
	total: number;
	emptied: number;
}

export async function addPanItem(userId: number, itemId: number, quantity: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO pan_project_items (item_id, quantity, user_id) VALUES (?, ?, ?)',
		args: [itemId, quantity, userId]
	});
}

export async function getPanItems(userId: number): Promise<PanProjectItem[]> {
	const db = getDb();
	const result = await db.execute({
		sql: `SELECT pp.*, i.name as item_name, c.name as category_name, c.icon as category_icon
			FROM pan_project_items pp
			JOIN items i ON pp.item_id = i.id
			JOIN categories c ON i.category_id = c.id
			WHERE pp.user_id = ?
			ORDER BY pp.created_at DESC`,
		args: [userId]
	});
	return result.rows.map(r => ({
		id: r.id as number,
		item_id: r.item_id as number,
		quantity: r.quantity as number,
		emptied: r.emptied as number,
		created_at: r.created_at as string,
		item_name: r.item_name as string,
		category_name: r.category_name as string,
		category_icon: r.category_icon as string
	}));
}

export async function markPanItemEmptied(panItemId: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE pan_project_items SET emptied = MIN(emptied + 1, quantity) WHERE id = ?',
		args: [panItemId]
	});
}

export async function removePanItem(userId: number, panItemId: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM pan_project_items WHERE id = ? AND user_id = ?',
		args: [panItemId, userId]
	});
}

export async function getPanProjectStats(userId: number): Promise<PanProjectStats> {
	const db = getDb();
	const result = await db.execute({
		sql: `SELECT COALESCE(SUM(quantity), 0) as total, COALESCE(SUM(emptied), 0) as emptied
			FROM pan_project_items WHERE user_id = ?`,
		args: [userId]
	});
	return {
		total: result.rows[0].total as number,
		emptied: result.rows[0].emptied as number
	};
}

// --- Shopping List ---

export interface ShoppingItem {
	id: number;
	name: string;
	quantity: number;
	checked: number;
	notes: string | null;
	created_at: string;
}

export async function addShoppingItem(
	userId: number,
	name: string,
	quantity?: number,
	notes?: string | null
): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'INSERT INTO shopping_list (name, quantity, notes, user_id) VALUES (?, ?, ?, ?)',
		args: [name, quantity ?? 1, notes ?? null, userId]
	});
}

export async function getShoppingList(userId: number): Promise<ShoppingItem[]> {
	const db = getDb();
	const result = await db.execute({
		sql: 'SELECT * FROM shopping_list WHERE user_id = ? ORDER BY checked ASC, created_at DESC',
		args: [userId]
	});
	return result.rows.map(r => ({
		id: r.id as number,
		name: r.name as string,
		quantity: r.quantity as number,
		checked: r.checked as number,
		notes: (r.notes as string) ?? null,
		created_at: r.created_at as string
	}));
}

export async function toggleShoppingItem(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE shopping_list SET checked = CASE WHEN checked = 0 THEN 1 ELSE 0 END WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

export async function deleteShoppingItem(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM shopping_list WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

export async function clearCheckedShoppingItems(userId: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM shopping_list WHERE checked = 1 AND user_id = ?',
		args: [userId]
	});
}

export async function updateBudget(
	userId: number,
	id: number,
	updates: Partial<{
		name: string | null;
		category_id: number | null;
		monthly_limit: number;
		carryover: boolean;
	}>
): Promise<void> {
	const db = getDb();
	const fields: string[] = [];
	const args: (string | number | null)[] = [];

	for (const [key, value] of Object.entries(updates)) {
		if (key === 'carryover') {
			fields.push('carryover = ?');
			args.push(value ? 1 : 0);
		} else if (key === 'category_id' && value === null) {
			// Skip null category_id — may violate NOT NULL on migrated databases
			continue;
		} else {
			fields.push(`${key} = ?`);
			args.push(value as string | number | null);
		}
	}

	if (fields.length === 0) return;
	args.push(id, userId);

	await db.execute({
		sql: `UPDATE budgets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
		args
	});
}

export async function deleteBudget(userId: number, id: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'DELETE FROM budgets WHERE id = ? AND user_id = ?',
		args: [id, userId]
	});
}

export async function updateShoppingItem(
	userId: number,
	id: number,
	updates: Partial<{
		name: string;
		quantity: number;
		notes: string | null;
	}>
): Promise<void> {
	const db = getDb();
	const fields: string[] = [];
	const args: (string | number | null)[] = [];

	for (const [key, value] of Object.entries(updates)) {
		fields.push(`${key} = ?`);
		args.push(value as string | number | null);
	}

	if (fields.length === 0) return;
	args.push(id, userId);

	await db.execute({
		sql: `UPDATE shopping_list SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
		args
	});
}

export async function updatePanItem(userId: number, id: number, quantity: number): Promise<void> {
	const db = getDb();
	await db.execute({
		sql: 'UPDATE pan_project_items SET quantity = ? WHERE id = ? AND user_id = ?',
		args: [quantity, id, userId]
	});
}
