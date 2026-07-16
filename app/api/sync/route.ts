import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import {
  syncAllTables,
  syncTable,
  syncChangedTables,
  ensureWebhookRegistered,
  SYNC_CONFIGS,
} from "../../../lib/syncEngine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await validateSession();
  if (!session || !["owner", "tech_admin"].includes(session.role.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetTable = searchParams.get("table");

  try {
    // Dynamic URL detection for self-healing webhooks
    const requestUrl = new URL(request.url);
    const notificationUrl = `${requestUrl.protocol}//${requestUrl.host}/api/sync`;

    // Auto-verify and register the webhook if expired or missing
    const autoHeal = await ensureWebhookRegistered(notificationUrl);
    console.log(
      `[Webhook Auto-Heal] URL: ${notificationUrl} | Status:`,
      autoHeal,
    );

    if (targetTable) {
      const config = SYNC_CONFIGS.find(
        (c) =>
          c.prismaModel.toLowerCase() === targetTable.toLowerCase() ||
          c.airtableTable.toLowerCase().includes(targetTable.toLowerCase()),
      );

      if (!config) {
        return NextResponse.json(
          { error: `Table "${targetTable}" not found in sync configs.` },
          { status: 404 },
        );
      }

      const result = await syncTable(config);
      return NextResponse.json({
        success: true,
        table: config.prismaModel,
        autoHeal,
        ...result,
      });
    }

    const results = await syncAllTables();
    return NextResponse.json({ success: true, autoHeal, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isWebhook = body.webhook && body.webhook.id;
    if (!isWebhook) {
      const session = await validateSession();
      if (!session || !["owner", "tech_admin"].includes(session.role.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // 1. Check if it's an official Airtable Base Webhook Ping
    if (body.webhook && body.webhook.id) {
      const webhookId = body.webhook.id;
      console.log(
        `[Webhook] Received native Airtable ping for webhook: ${webhookId}`,
      );

      const { refreshWebhook } = await import("../../../lib/syncEngine");
      await refreshWebhook(webhookId);

      const { syncedTables } = await syncChangedTables(webhookId);
      return NextResponse.json({
        success: true,
        message:
          "Successfully processed base webhook event and auto-refreshed webhook",
        syncedTables,
      });
    }

    // 2. Legacy Manual/Automation single table/record sync
    const { table, recordId } = body;

    if (!table) {
      return NextResponse.json(
        { error: 'Missing "table" or "webhook" payload in request body.' },
        { status: 400 },
      );
    }

    const config = SYNC_CONFIGS.find(
      (c) =>
        c.airtableTable === table ||
        c.prismaModel.toLowerCase() === table.toLowerCase(),
    );

    if (!config) {
      return NextResponse.json(
        { error: `Table "${table}" not found in sync configs.` },
        { status: 404 },
      );
    }

    if (recordId) {
      const airtableProxy = await import("../../../lib/airtableProxy");
      const prisma = (await import("../../../lib/prisma")).default;

      console.log(
        `[Webhook] Syncing single record "${recordId}" from table "${config.airtableTable}"...`,
      );
      const record = await airtableProxy.readRecord(config.airtableTableId, recordId);
      const data = config.mapFields(record.id, record.fields);

      const modelClient = (prisma as any)[config.prismaModel];
      await modelClient.upsert({
        where: { id: record.id },
        update: data,
        create: data,
      });

      return NextResponse.json({
        success: true,
        message: `Synced single record ${recordId}`,
      });
    }

    const result = await syncTable(config);
    return NextResponse.json({
      success: true,
      table: config.prismaModel,
      ...result,
    });
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 },
    );
  }
}
