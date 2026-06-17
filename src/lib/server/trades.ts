import {
  TRADE_OUTCOMES,
  TradeAccount,
  TradeAccountRecord,
  TradeFilters,
  TradeInput,
  TradeOutcome,
  TradeRecord,
  TradeRow,
} from '@/types/trade.types';

const TABLE = 'trade_orders';
const ACCOUNTS_TABLE = 'trade_accounts';
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

interface SupabaseTradeInsert {
  market_id: string;
  account_id: string;
  outcome: TradeOutcome;
  price: number;
  amount: number;
  trade_timestamp: string;
}

interface AccountRow {
  id: string;
  account: TradeAccount;
  created_at?: string;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY là bắt buộc trên Vercel',
    );
  }

  return {
    baseUrl: url.replace(/\/$/, ''),
    key,
  };
}

export async function parseTradeInputs(body: unknown): Promise<TradeInput[]> {
  if (!Array.isArray(body)) {
    throw new Error('Body phải là array các trade');
  }

  if (body.length === 0) {
    throw new Error('Body phải có ít nhất một trade');
  }

  return body.map((value, index) => normalizeTradeInput(value, index));
}

export async function insertTrades(trades: TradeInput[]): Promise<number> {
  const { baseUrl, key } = getSupabaseConfig();
  const accountIds = await upsertTradeAccounts(
    [...new Set(trades.map((trade) => trade.account))],
    baseUrl,
    key,
  );

  const payload = trades.map<SupabaseTradeInsert>((trade) => ({
    market_id: trade.marketId,
    account_id: requireAccountId(accountIds, trade.account),
    outcome: trade.outcome,
    price: trade.price,
    amount: trade.amount,
    trade_timestamp: new Date(trade.timestamp).toISOString(),
  }));

  const response = await fetch(`${baseUrl}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi ghi Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  return payload.length;
}

export async function queryTradeAccounts(): Promise<TradeAccountRecord[]> {
  const { baseUrl, key } = getSupabaseConfig();
  const params = new URLSearchParams({
    select: 'id,account,created_at',
    order: 'account.asc',
  });

  const response = await fetch(`${baseUrl}/rest/v1/${ACCOUNTS_TABLE}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi truy vấn Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  const rows = (await response.json()) as AccountRow[];

  return rows.map((row) => ({
    id: row.id,
    account: row.account,
    createdAt: row.created_at ?? '',
  }));
}

export async function queryTrades(
  filters: TradeFilters = {},
): Promise<TradeRecord[]> {
  const { baseUrl, key } = getSupabaseConfig();
  const params = new URLSearchParams({
    select:
      'id,market_id,account_id,outcome,price,amount,trade_timestamp,created_at,trade_accounts(account)',
    order: 'trade_timestamp.desc',
    limit: String(normalizeLimit(filters.limit)),
  });

  if (filters.account) {
    const accountId = await getAccountId(filters.account, baseUrl, key);
    if (!accountId) return [];
    params.set('account_id', `eq.${accountId}`);
  }
  if (filters.marketId) params.set('market_id', `eq.${filters.marketId}`);
  if (filters.outcome) params.set('outcome', `eq.${filters.outcome}`);
  if (filters.from) params.set('trade_timestamp', `gte.${toIso(filters.from, 'from')}`);
  if (filters.to) params.append('trade_timestamp', `lte.${toIso(filters.to, 'to')}`);

  const response = await fetch(`${baseUrl}/rest/v1/${TABLE}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi truy vấn Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  const rows = (await response.json()) as TradeRow[];
  return rows.map(mapTradeRow);
}

export function parseTradeFilters(searchParams: URLSearchParams): TradeFilters {
  const account = optionalString(searchParams, 'account');
  const outcome = optionalString(searchParams, 'outcome');
  const limit = optionalNumber(searchParams, 'limit');

  if (outcome && !isTradeOutcome(outcome)) {
    throw new Error('outcome chỉ hỗ trợ up hoặc down');
  }

  return {
    account: account as TradeAccount | undefined,
    marketId: optionalString(searchParams, 'marketId'),
    outcome: outcome as TradeOutcome | undefined,
    from: optionalString(searchParams, 'from'),
    to: optionalString(searchParams, 'to'),
    limit,
  };
}

export function createTestTrade(overrides: unknown): TradeInput {
  const source =
    overrides && typeof overrides === 'object' && !Array.isArray(overrides)
      ? (overrides as Record<string, unknown>)
      : {};

  return normalizeTradeInput(
    {
      marketId: source.marketId ?? 'test-market',
      account: source.account ?? 'tung',
      outcome: source.outcome ?? 'up',
      price: source.price ?? 0.5,
      amount: source.amount ?? 1,
      timestamp: source.timestamp ?? new Date().toISOString(),
    },
    0,
  );
}

function normalizeTradeInput(value: unknown, index: number): TradeInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Trade #${index + 1} không hợp lệ`);
  }

  const trade = value as Record<string, unknown>;
  const marketId = requiredString(trade.marketId, `Trade #${index + 1}: marketId`);
  const account = requiredString(trade.account, `Trade #${index + 1}: account`);
  const outcome = requiredString(trade.outcome, `Trade #${index + 1}: outcome`);
  const price = requiredNumber(trade.price, `Trade #${index + 1}: price`);
  const amount = requiredNumber(trade.amount, `Trade #${index + 1}: amount`);
  const timestamp = requiredString(
    trade.timestamp,
    `Trade #${index + 1}: timestamp`,
  );

  if (!isTradeAccount(account)) {
    throw new Error(
      `Trade #${index + 1}: account chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới`,
    );
  }
  if (!isTradeOutcome(outcome)) {
    throw new Error(`Trade #${index + 1}: outcome chỉ hỗ trợ up hoặc down`);
  }
  if (price < 0) {
    throw new Error(`Trade #${index + 1}: price phải >= 0`);
  }
  if (amount <= 0) {
    throw new Error(`Trade #${index + 1}: amount phải > 0`);
  }

  toIso(timestamp, `Trade #${index + 1}: timestamp`);

  return {
    marketId,
    account,
    outcome,
    price,
    amount,
    timestamp,
  };
}

function mapTradeRow(row: TradeRow): TradeRecord {
  return {
    id: row.id,
    marketId: row.market_id,
    accountId: row.account_id,
    account: row.trade_accounts?.account ?? row.account_id,
    outcome: row.outcome,
    price: Number(row.price),
    amount: Number(row.amount),
    timestamp: row.trade_timestamp,
    createdAt: row.created_at,
  };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} là bắt buộc`);
  }
  return value.trim();
}

function requiredNumber(value: unknown, label: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} phải là số`);
  }

  return parsed;
}

function optionalString(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value === null || value.trim() === '' ? undefined : value.trim();
}

function optionalNumber(
  searchParams: URLSearchParams,
  key: string,
): number | undefined {
  const value = optionalString(searchParams, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

async function upsertTradeAccounts(
  accounts: TradeAccount[],
  baseUrl: string,
  key: string,
): Promise<Map<TradeAccount, string>> {
  if (accounts.length === 0) return new Map();

  const response = await fetch(
    `${baseUrl}/rest/v1/${ACCOUNTS_TABLE}?on_conflict=account`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(accounts.map((account) => ({ account }))),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi ghi Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  return getAccountIds(accounts, baseUrl, key);
}

async function getAccountId(
  account: TradeAccount,
  baseUrl: string,
  key: string,
): Promise<string | null> {
  const ids = await getAccountIds([account], baseUrl, key);
  return ids.get(account) ?? null;
}

async function getAccountIds(
  accounts: TradeAccount[],
  baseUrl: string,
  key: string,
): Promise<Map<TradeAccount, string>> {
  const uniqueAccounts = [...new Set(accounts)];
  if (uniqueAccounts.length === 0) return new Map();

  const params = new URLSearchParams({
    select: 'id,account',
    account: `in.(${uniqueAccounts.join(',')})`,
  });

  const response = await fetch(`${baseUrl}/rest/v1/${ACCOUNTS_TABLE}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi truy vấn Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  const rows = (await response.json()) as AccountRow[];
  return new Map(rows.map((row) => [row.account, row.id]));
}

function requireAccountId(
  accountIds: Map<TradeAccount, string>,
  account: TradeAccount,
): string {
  const id = accountIds.get(account);
  if (!id) {
    throw new Error(`Không tìm thấy account "${account}" sau khi tạo`);
  }
  return id;
}

function toIso(value: string, label: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} không phải timestamp hợp lệ`);
  }
  return date.toISOString();
}

function isTradeAccount(value: string): value is TradeAccount {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value);
}

function isTradeOutcome(value: string): value is TradeOutcome {
  return (TRADE_OUTCOMES as readonly string[]).includes(value);
}
