import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { auditService } from "@/lib/audit";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getAirtableQueueStatus } from "@/lib/airtableProxy";
import { runReadinessChecks } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, fullName: true, email: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = normalizeRole(dbUser.role || "staff");

    // Gate access: only Owner and Tech Admin are authorized.
    if (userRole !== "owner" && userRole !== "tech_admin") {
      auditService.logFailure(
        { id: dbUser.id, email: dbUser.email, role: dbUser.role },
        "PERMISSION_DENIED",
        "SchemaDiagnostics",
        `Unauthorized schema diagnostics access attempt by role: ${dbUser.role}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Load config baselines
    const baselinePath = resolve(process.cwd(), "config", "schema-baseline.json");
    const fieldMapPath = resolve(process.cwd(), "config", "field-map.json");

    if (!existsSync(baselinePath) || !existsSync(fieldMapPath)) {
      return NextResponse.json(
        { error: "Required configuration files are missing on server." },
        { status: 500 }
      );
    }

    const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    const fieldMap = JSON.parse(readFileSync(fieldMapPath, "utf-8"));

    // 2. Fetch live schema and calculate hash comparison
    let currentHash = "UNREACHABLE";
    let liveTables: any[] = [];
    let liveFetchError: string | null = null;
    try {
      const { fetchBaseSchema, generateSchemaHash } = await import("@/lib/fetch-airtable-schema.mjs");
      const liveData = await fetchBaseSchema();
      liveTables = liveData.tables;
      currentHash = generateSchemaHash(liveTables);
    } catch (err: any) {
      console.warn("[Diagnostics API Warning] Failed to fetch live schema:", err.message);
      liveFetchError = err.message || "Failed to fetch live schema from Airtable Meta API.";
    }

    const baselineHash = baseline.schemaHash || "UNKNOWN";
    const hashMatched = currentHash !== "UNREACHABLE" && currentHash === baselineHash;

    // 3. Schema diff calculations (Added, Removed, Modified tables/fields)
    const addedTables: string[] = [];
    const removedTables: string[] = [];
    const renamedTables: { oldName: string; newName: string }[] = [];
    const fieldTypeMismatches: { table: string; field: string; oldType: string; newType: string }[] = [];

    if (liveTables.length > 0) {
      const baselineTablesMap = new Map<string, any>(baseline.tables.map((t: any) => [t.tableId, t]));
      const liveTablesMap = new Map<string, any>(liveTables.map((t: any) => [t.id, t]));

      // Identify added tables
      for (const [id, liveTable] of liveTablesMap) {
        if (!baselineTablesMap.has(id)) {
          addedTables.push(`${liveTable.name} (ID: ${id})`);
        }
      }

      // Identify removed & renamed tables
      for (const [id, baseTable] of baselineTablesMap) {
        const liveTable = liveTablesMap.get(id);
        if (!liveTable) {
          removedTables.push(`${baseTable.tableName} (ID: ${id})`);
        } else {
          if (baseTable.tableName !== liveTable.name) {
            renamedTables.push({ oldName: baseTable.tableName, newName: liveTable.name });
          }

          // Diffs field schemas inside this table
          const baseFields = new Map<string, any>(baseTable.fields.map((f: any) => [f.fieldId, f]));
          const liveFields = new Map<string, any>(liveTable.fields.map((f: any) => [f.id, f]));

          for (const [fid, baseField] of baseFields) {
            const liveField = liveFields.get(fid);
            if (liveField && baseField.fieldType !== liveField.type) {
              fieldTypeMismatches.push({
                table: liveTable.name,
                field: `${baseField.fieldName} (ID: ${fid})`,
                oldType: baseField.fieldType,
                newType: liveField.type,
              });
            }
          }
        }
      }
    }

    // 4. Mapped field integrity warnings (missing field IDs / table mappings in live)
    const mappingWarnings: string[] = [];
    if (liveTables.length > 0) {
      const liveTablesMap = new Map<string, any>(liveTables.map((t: any) => [t.id, t]));

      Object.entries(fieldMap.tables).forEach(([tableKey, tableSchema]: [string, any]) => {
        const liveTable = liveTablesMap.get(tableSchema.tableId);
        if (!liveTable) {
          mappingWarnings.push(`Table mapping missing in live Airtable: ${tableKey} (ID: ${tableSchema.tableId})`);
        } else {
          const liveFieldsMap = new Map(liveTable.fields.map((f: any) => [f.id, f]));
          Object.entries(tableSchema.fields).forEach(([fieldKey, fieldSchema]: [string, any]) => {
            if (!liveFieldsMap.has(fieldSchema.fieldId)) {
              mappingWarnings.push(
                `Field mapping missing in live Airtable: table ${tableSchema.tableName}, field '${fieldKey}' (ID: ${fieldSchema.fieldId})`
              );
            }
          });
        }
      });
    }

    // 5. Read-only fields inventory
    const readOnlyFields: any[] = [];
    Object.entries(fieldMap.tables).forEach(([tableKey, tableSchema]: [string, any]) => {
      Object.entries(tableSchema.fields).forEach(([fieldKey, fieldSchema]: [string, any]) => {
        if (fieldSchema.readOnly) {
          readOnlyFields.push({
            fieldName: fieldSchema.fieldName || fieldKey,
            fieldId: fieldSchema.fieldId,
            table: tableSchema.tableName,
            reason: fieldSchema.type || "Formula / Rollup",
          });
        }
      });
    });

    // 6. Rate limit status
    const rateLimit = getAirtableQueueStatus();

    // 7. Service health check aggregates
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (e) {
      console.error("[Diagnostics API db check failure]", e);
    }

    const readinessReport = await runReadinessChecks();
    const airtableAPIReach = readinessReport.checks.find((c) => c.name === "airtable_api")?.ok || false;

    // Log the audit event for Tech Admin reads
    auditService.logSensitiveRead(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      "SchemaDiagnostics",
      ["schema-baseline.json", "field-map.json"],
      ["schemaHash", "mappingWarnings", "readOnlyFields", "rateLimit"]
    );

    return NextResponse.json({
      hashes: {
        baselineHash,
        currentHash,
        hashMatched,
        liveFetchError,
      },
      schemaDiff: {
        addedTables,
        removedTables,
        renamedTables,
        fieldTypeMismatches,
      },
      mappingWarnings,
      readOnlyFields,
      rateLimit,
      health: {
        api: "healthy",
        database: dbConnected ? "healthy" : "unhealthy",
        airtableConnection: airtableAPIReach ? "healthy" : "unhealthy",
        readyStatus: readinessReport.status,
      },
      caddyStatus: {
        proxy: "Caddy (Standard Container Deployment)",
        tlsStatus: "Auto-renewing (Let's Encrypt / ZeroSSL)",
        https: "Enabled",
        details: "Reverse proxy TLS certificates are managed and auto-renewed directly on the hosting instance by Caddy server runtime. Real-time expiry dates are not queryable from within the container.",
      },
      breakGlass: {
        status: "Inactive (Normal Operations Mode)",
        details: "Tech Admin permissions are locked to metadata-only view. No production business data renderer is allowed.",
      },
      meta: {
        generatedAt: fieldMap._meta.generatedAt,
        baseId: fieldMap._meta.baseId,
        totalTables: fieldMap._meta.totalTables,
      },
    });
  } catch (error) {
    console.error("[Schema Diagnostics API Error]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
