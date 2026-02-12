export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS schema_version (
	version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	greeting TEXT NOT NULL DEFAULT 'Good Morning',
	avatar_url TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profile (
	id INTEGER PRIMARY KEY DEFAULT 1,
	name TEXT NOT NULL DEFAULT 'Elena',
	greeting TEXT NOT NULL DEFAULT 'Good Morning',
	email TEXT,
	password_hash TEXT,
	avatar_url TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE,
	icon TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subcategories (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	category_id INTEGER NOT NULL,
	icon TEXT,
	UNIQUE(name, category_id),
	FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	category_id INTEGER NOT NULL,
	subcategory_id INTEGER,
	status TEXT NOT NULL DEFAULT 'active',
	purchase_price REAL,
	purchase_date TEXT,
	quantity INTEGER DEFAULT 1,
	notes TEXT,
	used_up_at TEXT,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (category_id) REFERENCES categories(id),
	FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

CREATE TABLE IF NOT EXISTS challenges (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	icon TEXT NOT NULL DEFAULT 'ri-trophy-line',
	tag TEXT NOT NULL DEFAULT 'Project Pan',
	total INTEGER NOT NULL,
	completed INTEGER NOT NULL DEFAULT 0,
	deadline TEXT,
	category_id INTEGER,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT,
	category_id INTEGER,
	monthly_limit REAL NOT NULL,
	spent REAL NOT NULL DEFAULT 0,
	month TEXT NOT NULL,
	carryover INTEGER NOT NULL DEFAULT 0,
	carryover_amount REAL NOT NULL DEFAULT 0,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS purchases (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER,
	category_id INTEGER NOT NULL,
	subcategory_id INTEGER,
	name TEXT NOT NULL,
	amount REAL NOT NULL,
	purchase_date TEXT NOT NULL DEFAULT (date('now')),
	notes TEXT,
	feeling TEXT,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (item_id) REFERENCES items(id),
	FOREIGN KEY (category_id) REFERENCES categories(id),
	FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

CREATE TABLE IF NOT EXISTS usage_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER NOT NULL,
	used_at TEXT NOT NULL DEFAULT (datetime('now')),
	notes TEXT,
	user_id INTEGER NOT NULL DEFAULT 1,
	FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS declutter_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER NOT NULL,
	reason TEXT,
	method TEXT NOT NULL DEFAULT 'donated',
	amount_recovered REAL NOT NULL DEFAULT 0,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS wishlist (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	category_id INTEGER,
	subcategory_id INTEGER,
	estimated_price REAL,
	added_at TEXT NOT NULL DEFAULT (datetime('now')),
	wait_until TEXT,
	purchased INTEGER NOT NULL DEFAULT 0,
	notes TEXT,
	user_id INTEGER NOT NULL DEFAULT 1,
	FOREIGN KEY (category_id) REFERENCES categories(id),
	FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

CREATE TABLE IF NOT EXISTS streaks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	category_id INTEGER,
	streak_type TEXT NOT NULL DEFAULT 'no_buy',
	start_date TEXT NOT NULL DEFAULT (date('now')),
	last_active_date TEXT NOT NULL DEFAULT (date('now')),
	current_count INTEGER NOT NULL DEFAULT 0,
	best_count INTEGER NOT NULL DEFAULT 0,
	active INTEGER NOT NULL DEFAULT 1,
	user_id INTEGER NOT NULL DEFAULT 1,
	FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS achievements (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	key TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	icon TEXT NOT NULL,
	unlocked INTEGER NOT NULL DEFAULT 0,
	unlocked_at TEXT,
	user_id INTEGER NOT NULL DEFAULT 1,
	UNIQUE(key, user_id)
);

CREATE TABLE IF NOT EXISTS monthly_stats (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	month TEXT NOT NULL,
	empty_items INTEGER NOT NULL DEFAULT 0,
	total_saved REAL NOT NULL DEFAULT 0,
	budget_percentage REAL NOT NULL DEFAULT 0,
	user_id INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE(month, user_id)
);

CREATE TABLE IF NOT EXISTS pan_project_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER NOT NULL,
	quantity INTEGER NOT NULL DEFAULT 1,
	emptied INTEGER NOT NULL DEFAULT 0,
	user_id INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (item_id) REFERENCES items(id),
	FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shopping_list (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	quantity INTEGER NOT NULL DEFAULT 1,
	checked INTEGER NOT NULL DEFAULT 0,
	notes TEXT,
	user_id INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_subcategory_id ON items(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_category_id ON purchases(category_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_usage_log_item_id ON usage_log(item_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_used_at ON usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_declutter_log_item_id ON declutter_log(item_id);
CREATE INDEX IF NOT EXISTS idx_declutter_log_method ON declutter_log(method);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_category_month ON budgets(category_id, month);
CREATE INDEX IF NOT EXISTS idx_streaks_active ON streaks(active);
CREATE INDEX IF NOT EXISTS idx_wishlist_purchased ON wishlist(purchased);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_challenges_category_id ON challenges(category_id);
CREATE INDEX IF NOT EXISTS idx_streaks_best_count ON streaks(best_count);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);
CREATE INDEX IF NOT EXISTS idx_pan_project_items_user_id ON pan_project_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pan_project_items_item_id ON pan_project_items(item_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_user_id ON shopping_list(user_id);
`;

export const USER_ID_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_declutter_log_user_id ON declutter_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user_id ON monthly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

export const SEED_DATA = `
INSERT OR IGNORE INTO user_profile (id, name, greeting) VALUES (1, 'Elena', 'Good Morning');

INSERT OR IGNORE INTO categories (name, icon) VALUES ('Beauty', 'ri-magic-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Fashion', 'ri-t-shirt-air-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Home', 'ri-home-heart-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Stationery', 'ri-book-3-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Food & Pantry', 'ri-restaurant-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Digital', 'ri-computer-line');
INSERT OR IGNORE INTO categories (name, icon) VALUES ('Misc', 'ri-gift-line');
`;

export const SEED_SUBCATEGORIES = `
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Skincare', 1, 'ri-drop-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Makeup', 1, 'ri-brush-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Haircare', 1, 'ri-scissors-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Fragrance', 1, 'ri-flask-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Tops', 2, 'ri-shirt-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Bottoms', 2, 'ri-t-shirt-air-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Shoes', 2, 'ri-footprint-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Accessories', 2, 'ri-handbag-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Candles', 3, 'ri-fire-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Cleaning', 3, 'ri-hand-sanitizer-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Decor', 3, 'ri-plant-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Pens', 4, 'ri-pen-nib-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Notebooks', 4, 'ri-book-open-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Washi Tape', 4, 'ri-scissors-cut-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Stickers', 4, 'ri-sticky-note-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Snacks', 5, 'ri-cake-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Pantry Staples', 5, 'ri-store-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Beverages', 5, 'ri-cup-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Spices', 5, 'ri-leaf-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Apps', 6, 'ri-apps-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Subscriptions', 6, 'ri-refresh-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Games', 6, 'ri-gamepad-line');

INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Gifts', 7, 'ri-gift-2-line');
INSERT OR IGNORE INTO subcategories (name, category_id, icon) VALUES ('Samples', 7, 'ri-test-tube-line');
`;

export const ACHIEVEMENT_DEFINITIONS = [
	{ key: 'first_use_up', title: 'First Finish', description: 'Used up your first product', icon: 'ri-check-double-line' },
	{ key: 'streak_7', title: 'Week Warrior', description: '7-day no-buy streak', icon: 'ri-fire-line' },
	{ key: 'streak_30', title: 'Monthly Master', description: '30-day no-buy streak', icon: 'ri-medal-line' },
	{ key: 'ten_items_used', title: 'Pan 10', description: 'Used up 10 products', icon: 'ri-trophy-line' },
	{ key: 'budget_under', title: 'Budget Boss', description: 'Stayed under budget for a full month', icon: 'ri-money-dollar-circle-line' },
	{ key: 'first_challenge', title: 'Challenger', description: 'Completed your first challenge', icon: 'ri-flag-line' },
	{ key: 'wishlist_wait', title: 'Patient Buyer', description: 'Waited 30 days on a wishlist item', icon: 'ri-time-line' },
	{ key: 'fifty_uses', title: 'Dedicated User', description: 'Logged 50 total product uses', icon: 'ri-star-line' },
	{ key: 'first_declutter', title: 'Letting Go', description: 'Decluttered your first item', icon: 'ri-delete-bin-line' },
	{ key: 'five_declutters', title: 'Marie Kondo', description: 'Decluttered 5 items', icon: 'ri-sparkling-line' },
];
