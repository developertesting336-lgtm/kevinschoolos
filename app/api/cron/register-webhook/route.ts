import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Verify cron auth secret (in development, bypass check if CRON_SECRET is not set)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("[Cron Webhook] Unauthorized access attempt.");
      return new Response("Unauthorized", { status: 401 });
    }

    const baseId = process.env.AIRTABLE_BASE_ID;
    const pat = process.env.AIRTABLE_PAT;

    if (!baseId || !pat) {
      console.error("[Cron Webhook] Missing AIRTABLE_BASE_ID or AIRTABLE_PAT env variables.");
      return NextResponse.json(
        { error: "Server misconfiguration: missing credentials." },
        { status: 500 }
      );
    }

    // Resolve notification URL dynamically based on the current hostname
    const requestUrl = new URL(request.url);
    const notificationUrl = `${requestUrl.protocol}//${requestUrl.host}/api/sync`;

    console.log(`[Cron Webhook] Renewing Airtable webhook for base ${baseId} pointing to ${notificationUrl}...`);

    const response = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationUrl,
        specification: {
          options: {
            filters: {
              dataTypes: ["tableData"],
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Cron Webhook] Airtable API error:", data);
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    console.log("[Cron Webhook] Webhook renewed successfully!", data);
    return NextResponse.json({
      success: true,
      message: "Webhook registered successfully via Vercel Cron Job.",
      webhook: data,
    });
  } catch (error: any) {
    console.error("[Cron Webhook Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
