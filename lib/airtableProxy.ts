/**
 * lib/airtableProxy.ts
 *
 * Reusable server-side Airtable proxy module.
 * Wraps every Airtable REST API request to enforce the base allow-list,
 * handle rate limits (429) automatically via a paced queue, handle pagination,
 * resolve linked records recursively with cycle detection, cache results,
 * and translate field names to field IDs from config/field-map.json.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Base Allow-list & Credentials Configuration
// ---------------------------------------------------------------------------

const ALLOWED_BASE_IDS = ["appT1VyuwHzKGhOId"];

function validateBaseId(baseId: string): void {
  if (!baseId) {
    throw new Error("Airtable Base ID is not configured.");
  }
  if (!ALLOWED_BASE_IDS.includes(baseId)) {
    throw new Error(`Airtable Base ID "${baseId}" is not in the allow-list.`);
  }
  const envBaseId = process.env.AIRTABLE_BASE_ID;
  if (baseId !== envBaseId) {
    throw new Error(`Airtable Base ID "${baseId}" does not match the configured env BASE_ID.`);
  }
}

function getPAT(): string {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    throw new Error("Airtable PAT is not configured on the server.");
  }
  return pat;
}

// ---------------------------------------------------------------------------
// Load config/field-map.json at Startup
// ---------------------------------------------------------------------------

interface FieldSchema {
  fieldId: string;
  fieldName: string;
  type: string;
  readOnly: boolean;
  linkedTableId?: string;
  description?: string;
}

interface TableSchema {
  tableId: string;
  tableName: string;
  tier: string;
  tierName: string;
  automationOwned?: boolean;
  appWritable?: boolean;
  appendOnly?: boolean;
  description: string | null;
  fields: Record<string, FieldSchema>;
}

interface FieldMap {
  _meta: {
    generatedAt: string;
    baseId: string;
    totalTables: number;
  };
  tables: Record<string, TableSchema>;
}

let fieldMap: FieldMap | null = null;
const tablesById: Record<string, TableSchema> = {};
const tablesByName: Record<string, TableSchema> = {};

// Hardcoded Prisma model to Airtable Table ID mapping for integration ease
const prismaToTableId: Record<string, string> = {
  branch: "tbl2utdNdP9usMXLf",
  user: "tblUkEhqFJBFTvRN5",
  course: "tblgvltY5JtmMZs1q",
  tuitionplan: "tbldiIHLyH7bup2XG",
  term: "tblVSaneGtUOq5Xzr",
  room: "tblunCF2EX30onveH",
  lead: "tblItZ3B7d4YRO9ih",
  trial: "tblfvl5TjmWtr24Yp",
  parent: "tblRJNw4S6o1WPjBI",
  student: "tbl9Ddw4uRQ3i6e1B",
  classgroup: "tblpUJni7tMvO2QBs",
  enrollment: "tblVA5O7fnBx5cAnJ",
  session: "tblUE4gfr8en6lfUS",
  attendance: "tblbOAIuMZHgtsjEP",
  invoice: "tblTB6N6jNqSFvEER",
  payment: "tbliFcGpMbqnMaD9S",
  account: "tblLkuBm7zVJKpzzu",
  journalentry: "tblRf3mdeZmzp2mnf",
  ledgerline: "tbl0A506K9OVCorYv",
  vendor: "tblAu08dz4NZJ5HDs",
  expense: "tblZPcDPnzTxp0sol",
  franchiseroyalty: "tbl2YiFYDq00gJIrF",
  teacherpay: "tblGVA0enM9oxS9C0",
  teacherhours: "tblcOJdLkCBXXJ3AL",
  activity: "tblbGzoGxZVLRPB7k",
  channelperformance: "tblJQ9zndF47zIBVg",
  notificationlog: "tblMsyDxS6ltliuU1"
};

try {
  const fieldMapPath = resolve(process.cwd(), "config", "field-map.json");
  const raw = readFileSync(fieldMapPath, "utf8");
  fieldMap = JSON.parse(raw);
  if (fieldMap && fieldMap.tables) {
    for (const table of Object.values(fieldMap.tables)) {
      tablesById[table.tableId] = table;
      tablesByName[table.tableName.toLowerCase()] = table;
    }
  }
  logger.info({ totalTables: fieldMap?._meta?.totalTables }, "Loaded field-map.json successfully inside Airtable Proxy");
} catch (error) {
  logger.error(error, "Failed to load config/field-map.json during Airtable Proxy initialization");
}

export function getTableById(tableId: string): TableSchema | null {
  return tablesById[tableId] || null;
}

export function getFieldById(tableId: string, fieldId: string): FieldSchema | null {
  const table = tablesById[tableId];
  if (!table) return null;
  return table.fields[fieldId] || null;
}

export function resolveTable(tableIdOrName: string): TableSchema | null {
  if (!tableIdOrName) return null;

  // 1. Resolve direct table ID
  if (tablesById[tableIdOrName]) {
    return tablesById[tableIdOrName];
  }

  // 2. Resolve Prisma model names
  const lowerName = tableIdOrName.toLowerCase();
  const matchedTableId = prismaToTableId[lowerName];
  if (matchedTableId && tablesById[matchedTableId]) {
    return tablesById[matchedTableId];
  }

  // 3. Resolve table by exact name
  if (tablesByName[lowerName]) {
    return tablesByName[lowerName];
  }

  // 4. Resolve table by substring match
  for (const table of Object.values(tablesById)) {
    if (table.tableName.toLowerCase().includes(lowerName)) {
      return table;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Field mapping helper
// ---------------------------------------------------------------------------

export function mapRecord(
  tableIdOrName: string,
  record: any,
  direction: "toFieldIds" | "toDisplayNames"
): any {
  if (!record) return record;
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found for mapping: ${tableIdOrName}`);
  }

  const isFullRecord = typeof record === "object" && record !== null && "fields" in record;
  const fields = isFullRecord ? record.fields : record;
  const mappedFields: Record<string, any> = {};

  if (direction === "toFieldIds") {
    // Build a display-to-ID index for this table
    const nameToId: Record<string, string> = {};
    for (const field of Object.values(table.fields)) {
      nameToId[field.fieldName] = field.fieldId;
    }
    // Specific hotfix for Normal Side encoding truncation in baseline
    nameToId["Normal Side / Но保留"] = "fld2mqd9QfmRkTgxs";

    for (const [key, value] of Object.entries(fields)) {
      const fieldId = nameToId[key];
      if (fieldId) {
        mappedFields[fieldId] = value;
      } else {
        mappedFields[key] = value;
      }
    }
  } else {
    // Convert field ID keys to display name keys
    for (const [key, value] of Object.entries(fields)) {
      const fieldMeta = table.fields[key];
      if (fieldMeta) {
        mappedFields[fieldMeta.fieldName] = value;
      } else {
        mappedFields[key] = value;
      }
    }
  }

  return isFullRecord ? { ...record, fields: mappedFields } : mappedFields;
}

// ---------------------------------------------------------------------------
// In-Memory Resolver Cache
// ---------------------------------------------------------------------------

export interface CacheEntry {
  record: any;
  timestamp: number;
}

export class AirtableCache {
  private cache = new Map<string, CacheEntry>();
  private ttl: number; // in milliseconds

  constructor(ttlSeconds: number = 60) {
    this.ttl = ttlSeconds * 1000;
  }

  get(tableId: string, recordId: string): any | null {
    const key = `${tableId}:${recordId}`;
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.record;
  }

  set(tableId: string, recordId: string, record: any): void {
    const key = `${tableId}:${recordId}`;
    this.cache.set(key, {
      record,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global shared proxy cache instance (configurable via exports)
export const globalCache = new AirtableCache(10); // Default TTL 10s

// ---------------------------------------------------------------------------
// Request Rate-Limit Queue & Backoff
// ---------------------------------------------------------------------------

class RequestQueue {
  private queue: { task: () => Promise<any>; resolve: (v: any) => void; reject: (e: any) => void }[] = [];
  private activeCount = 0;
  private maxConcurrency = 5;
  private isPaused = false;
  private lastRequestTime = 0;
  private minInterval = 200; // Pacing: min 200ms between requests (5/sec)

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  pause(durationMs: number): void {
    if (this.isPaused) return;
    this.isPaused = true;
    logger.warn({ durationMs }, `Pausing request queue due to 429 rate limit.`);
    setTimeout(() => {
      this.isPaused = false;
      this.processNext();
    }, durationMs);
  }

  private async processNext(): Promise<void> {
    if (this.isPaused || this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      const delay = this.minInterval - elapsed;
      setTimeout(() => this.processNext(), delay);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    this.lastRequestTime = Date.now();

    try {
      const res = await item.task();
      item.resolve(res);
    } catch (err: any) {
      item.reject(err);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }
}

const requestQueue = new RequestQueue();

// Robust fetch wrapping execution inside the queue with backoff retries on 429
async function fetchWithQueue(url: string, init?: RequestInit): Promise<Response> {
  return requestQueue.enqueue(async () => {
    let attempt = 1;
    while (true) {
      try {
        const response = await fetch(url, init);

        if (response.status === 429) {
          if (attempt >= 5) {
            throw new Error(`Airtable rate limit exceeded after ${attempt} attempts.`);
          }

          let retryAfterMs = 0;
          const retryHeader = response.headers.get("Retry-After");
          if (retryHeader) {
            const parsed = parseInt(retryHeader, 10);
            if (!isNaN(parsed)) {
              retryAfterMs = parsed <= 120 ? parsed * 1000 : parsed;
            }
          }

          if (retryAfterMs <= 0) {
            // Exponential backoff fallback: 1s, 2s, 4s, 8s plus random jitter up to 1s
            retryAfterMs = Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000;
          }

          logger.warn({ url, attempt, retryAfterMs }, `Airtable HTTP 429 received. Backing off...`);
          requestQueue.pause(retryAfterMs);

          await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
          attempt++;
          continue;
        }

        return response;
      } catch (error: any) {
        if (attempt >= 5) {
          throw error;
        }
        // Retry network failures
        const retryAfterMs = Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000;
        logger.warn({ url, attempt, retryAfterMs, error: error.message || String(error) }, `Airtable request network failure. Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        attempt++;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Error Handling Helper
// ---------------------------------------------------------------------------

async function handleHttpError(response: Response, prefix: string): Promise<never> {
  let details = "";
  try {
    details = await response.text();
  } catch (e) {}

  const status = response.status;
  const statusText = response.statusText;

  logger.error({ status, statusText, details }, `${prefix}`);

  // Mask secrets from logs and error details
  const cleanDetails = details.replace(/pat_[a-zA-Z0-9]{15,}/g, "pat_***");

  if (status === 401) {
    throw new Error(`Unauthorized (401): Airtable PAT is invalid or revoked. Details: ${cleanDetails}`);
  }
  if (status === 403) {
    throw new Error(`Forbidden (403): Airtable PAT does not have permission for the base/operation. Details: ${cleanDetails}`);
  }
  if (status === 404) {
    throw new Error(`Not Found (404): Table or record not found. Details: ${cleanDetails}`);
  }
  if (status === 429) {
    throw new Error(`Too Many Requests (429): Rate limit exceeded. Details: ${cleanDetails}`);
  }
  if (status >= 500) {
    throw new Error(`Server Error (${status}) from Airtable: ${statusText}. Details: ${cleanDetails}`);
  }
  throw new Error(`${prefix} - HTTP ${status} ${statusText}: ${cleanDetails}`);
}

// ---------------------------------------------------------------------------
// Reusable API Endpoints
// ---------------------------------------------------------------------------

export interface ReadTableOptions {
  baseId?: string;
  view?: string;
  filterByFormula?: string;
  sort?: { field: string; direction?: "asc" | "desc" }[];
  resolveLinks?: boolean;
  cache?: AirtableCache;
  maxRecords?: number;
}

/**
 * Reads all records from a table, handling pagination and ID mapping transparently.
 */
export async function readTable(
  tableIdOrName: string,
  options: ReadTableOptions = {}
): Promise<any[]> {
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found in schema field map: "${tableIdOrName}"`);
  }

  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID || "";
  validateBaseId(baseId);

  const pat = getPAT();
  const tableId = table.tableId;

  const allRecords: any[] = [];
  let offset: string | undefined = undefined;
  const limit = options.maxRecords;

  logger.info({ tableId, tableName: table.tableName }, `Airtable Proxy reading table records...`);

  do {
    const params = new URLSearchParams();
    if (offset) params.append("offset", offset);
    if (options.view) params.append("view", options.view);
    if (options.filterByFormula) params.append("filterByFormula", options.filterByFormula);

    if (options.sort && Array.isArray(options.sort)) {
      options.sort.forEach((item, index) => {
        // Resolve field display name for Airtable REST API
        let fieldName = item.field;
        const fieldMeta = table.fields[item.field];
        if (fieldMeta) {
          fieldName = fieldMeta.fieldName;
        }
        params.append(`sort[${index}][field]`, fieldName);
        params.append(`sort[${index}][direction]`, item.direction || "asc");
      });
    }

    const remaining = limit ? limit - allRecords.length : 100;
    if (remaining <= 0) break;
    params.append("pageSize", Math.min(remaining, 100).toString());

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`;
    const response = await fetchWithQueue(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });

    if (!response.ok) {
      await handleHttpError(response, `Failed to read table ${tableId}`);
    }

    const data = await response.json();
    const pageRecords = data.records || [];
    
    // Map records to use field IDs instead of display names
    const mapped = pageRecords.map((r: any) => mapRecord(tableId, r, "toFieldIds"));
    allRecords.push(...mapped);

    offset = data.offset;
    if (offset) {
      logger.info({ tableId, currentCount: allRecords.length }, `Fetched pagination page offset from Airtable.`);
    }
  } while (offset && (!limit || allRecords.length < limit));

  if (options.resolveLinks) {
    const activeCache = options.cache || globalCache;
    return resolveLinkedRecords(allRecords, { cache: activeCache });
  }

  return allRecords;
}

export const readRecords = readTable;

export interface ReadRecordOptions {
  baseId?: string;
  resolveLinks?: boolean;
  cache?: AirtableCache;
}

/**
 * Reads a single record from a table. Supports cache checking.
 */
export async function readRecord(
  tableIdOrName: string,
  recordId: string,
  options: ReadRecordOptions = {}
): Promise<any> {
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found in schema field map: "${tableIdOrName}"`);
  }

  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID || "";
  validateBaseId(baseId);

  const pat = getPAT();
  const tableId = table.tableId;

  const activeCache = options.cache || globalCache;
  const cached = activeCache.get(tableId, recordId);
  if (cached) {
    logger.info({ tableId, recordId }, `Airtable Proxy Cache hit for record.`);
    if (options.resolveLinks) {
      return (await resolveLinkedRecords([cached], { cache: activeCache }))[0];
    }
    return cached;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`;
  const response = await fetchWithQueue(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  if (!response.ok) {
    await handleHttpError(response, `Failed to read record ${recordId} in table ${tableId}`);
  }

  const data = await response.json();
  const mapped = mapRecord(tableId, data, "toFieldIds");

  activeCache.set(tableId, recordId, mapped);

  if (options.resolveLinks) {
    const resolved = await resolveLinkedRecords([mapped], { cache: activeCache });
    return resolved[0];
  }

  return mapped;
}

// ---------------------------------------------------------------------------
// Linked Record Resolver with Cycle Detection
// ---------------------------------------------------------------------------

export interface ResolveLinkedRecordsOptions {
  cache?: AirtableCache;
  maxDepth?: number;
}

export async function resolveLinkedRecords(
  records: any[],
  options: ResolveLinkedRecordsOptions = {}
): Promise<any[]> {
  const activeCache = options.cache || globalCache;
  const maxDepth = options.maxDepth ?? 3;

  const resolvedRecords: any[] = [];
  for (const record of records) {
    const resolved = await resolveRecordRecursive(record, new Set<string>(), activeCache, 0, maxDepth);
    resolvedRecords.push(resolved);
  }
  return resolvedRecords;
}

async function resolveRecordRecursive(
  record: any,
  visited: Set<string>,
  cache: AirtableCache,
  currentDepth: number,
  maxDepth: number
): Promise<any> {
  if (!record || typeof record !== "object" || !record.id) {
    return record;
  }

  if (visited.has(record.id)) {
    // Break cycle recursion by returning record ID
    return record.id;
  }

  if (currentDepth >= maxDepth) {
    return record; // Stop recursion at maximum depth
  }

  const tableId = resolveTableByFields(record.fields);
  if (!tableId) return record;

  const table = tablesById[tableId];
  if (!table) return record;

  const resolvedFields = { ...record.fields };
  visited.add(record.id);

  for (const [fieldId, value] of Object.entries(resolvedFields)) {
    const fieldMeta = table.fields[fieldId];
    if (fieldMeta && fieldMeta.type === "multipleRecordLinks" && Array.isArray(value)) {
      const targetTableId = fieldMeta.linkedTableId;
      if (!targetTableId) continue;

      const resolvedArray = [];
      for (const linkedId of value) {
        if (typeof linkedId === "string") {
          let linkedRecord = cache.get(targetTableId, linkedId);
          if (!linkedRecord) {
            try {
              linkedRecord = await readRecord(targetTableId, linkedId, { cache });
            } catch (err) {
              logger.warn({ targetTableId, linkedId, err }, `Airtable Proxy failed resolving link.`);
            }
          }

          if (linkedRecord) {
            const nextVisited = new Set(visited);
            const resolved = await resolveRecordRecursive(linkedRecord, nextVisited, cache, currentDepth + 1, maxDepth);
            resolvedArray.push(resolved);
          } else {
            resolvedArray.push(linkedId);
          }
        } else {
          resolvedArray.push(linkedId);
        }
      }
      resolvedFields[fieldId] = resolvedArray;
    }
  }

  return { ...record, fields: resolvedFields };
}

/**
 * Deduce which table a record belongs to by comparing its field IDs against the field map.
 */
function resolveTableByFields(fields: Record<string, any>): string | null {
  if (!fields || Object.keys(fields).length === 0) return null;
  let bestTableId: string | null = null;
  let maxMatches = 0;

  for (const table of Object.values(tablesById)) {
    let matches = 0;
    for (const key of Object.keys(fields)) {
      if (table.fields[key]) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTableId = table.tableId;
    }
  }

  return bestTableId;
}

// ---------------------------------------------------------------------------
// Write API Endpoints
// ---------------------------------------------------------------------------

export async function createRecord(
  tableIdOrName: string,
  data: any,
  options: { baseId?: string } = {}
): Promise<any> {
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found in schema field map: "${tableIdOrName}"`);
  }

  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID || "";
  validateBaseId(baseId);

  const pat = getPAT();
  const tableId = table.tableId;

  // Map incoming field IDs back to display names for Airtable API
  const displayFields = mapRecord(tableId, data, "toDisplayNames");

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
  const response = await fetchWithQueue(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: displayFields }),
  });

  if (!response.ok) {
    await handleHttpError(response, `Failed to create record in table ${tableId}`);
  }

  const result = await response.json();
  return mapRecord(tableId, result, "toFieldIds");
}

export async function updateRecord(
  tableIdOrName: string,
  recordId: string,
  data: any,
  options: { baseId?: string } = {}
): Promise<any> {
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found in schema field map: "${tableIdOrName}"`);
  }

  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID || "";
  validateBaseId(baseId);

  const pat = getPAT();
  const tableId = table.tableId;

  // Map incoming field IDs back to display names for Airtable API
  const displayFields = mapRecord(tableId, data, "toDisplayNames");

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`;
  const response = await fetchWithQueue(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: displayFields }),
  });

  if (!response.ok) {
    await handleHttpError(response, `Failed to update record ${recordId} in table ${tableId}`);
  }

  const result = await response.json();
  return mapRecord(tableId, result, "toFieldIds");
}

export async function deleteRecord(
  tableIdOrName: string,
  recordId: string,
  options: { baseId?: string } = {}
): Promise<any> {
  const table = resolveTable(tableIdOrName);
  if (!table) {
    throw new Error(`Table not found in schema field map: "${tableIdOrName}"`);
  }

  const baseId = options.baseId || process.env.AIRTABLE_BASE_ID || "";
  validateBaseId(baseId);

  const pat = getPAT();
  const tableId = table.tableId;

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`;
  const response = await fetchWithQueue(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  if (!response.ok) {
    await handleHttpError(response, `Failed to delete record ${recordId} in table ${tableId}`);
  }

  return response.json();
}

/**
 * Simple validation reachability check to see if we can read the base metadata.
 */
export async function checkAirtableReachable(baseId: string): Promise<boolean> {
  try {
    validateBaseId(baseId);
    const pat = getPAT();
    const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    const response = await fetchWithQueue(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}
