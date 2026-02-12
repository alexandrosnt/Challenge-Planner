import { invoke } from '@tauri-apps/api/core';
import { syncAfterWrite } from './sync';

export interface ResultSet {
	columns: string[];
	rows: Row[];
	rowsAffected: number;
	lastInsertRowid: bigint;
}

type Row = Record<string, unknown> & unknown[];

export type InStatement =
	| string
	| {
			sql: string;
			args?: unknown[];
	  };

interface RawResult {
	columns: string[];
	rows: unknown[][];
	rows_affected: number;
	last_insert_rowid: number;
}

export async function initDb(): Promise<void> {
	const url = import.meta.env.VITE_TURSO_DATABASE_URL;
	const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
	await invoke('db_init', {
		url: url || null,
		authToken: authToken || null
	});
}

function toResultSet(raw: RawResult): ResultSet {
	const columns = raw.columns;
	const rows = raw.rows.map((row) => {
		const obj: any = [...row];
		columns.forEach((col, i) => {
			obj[col] = row[i];
		});
		return obj;
	});
	return {
		columns,
		rows,
		rowsAffected: raw.rows_affected,
		lastInsertRowid: BigInt(raw.last_insert_rowid)
	};
}

function normalizeStmt(s: InStatement): { sql: string; args: unknown[] } {
	return typeof s === 'string' ? { sql: s, args: [] } : { sql: s.sql, args: s.args ?? [] };
}

function isWrite(sql: string): boolean {
	const cmd = sql.trimStart().substring(0, 6).toUpperCase();
	return cmd.startsWith('INSERT') || cmd.startsWith('UPDATE') || cmd.startsWith('DELETE') || cmd.startsWith('ALTER');
}

const client = {
	async execute(stmt: InStatement): Promise<ResultSet> {
		const { sql, args } = normalizeStmt(stmt);
		const raw = await invoke<RawResult>('db_execute', { sql, args });
		if (isWrite(sql)) syncAfterWrite();
		return toResultSet(raw);
	},

	async batch(stmts: InStatement[], _mode?: string): Promise<ResultSet[]> {
		const normalized = stmts.map((s) => normalizeStmt(s));
		const raw = await invoke<RawResult[]>('db_batch', {
			statements: normalized.map(({ sql, args }) => ({ sql, args }))
		});
		if (normalized.some(({ sql }) => isWrite(sql))) syncAfterWrite();
		return raw.map(toResultSet);
	}
};

export function getDb() {
	return client;
}
