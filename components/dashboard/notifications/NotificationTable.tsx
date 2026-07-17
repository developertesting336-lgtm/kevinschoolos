"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageSquare,
  Lock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface LinkedRecord {
  id: string;
  label: string;
  type: string;
  restricted: boolean;
}

interface Notification {
  id: string;
  notificationId: string;
  type: string | null;
  channel: string | null;
  status: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  message: string | null;
  recipientType: string;
  recipientName: string;
  recipientRestricted: boolean;
  branchName: string;
  createdBy: string;
  links: LinkedRecord[];
}

interface NotificationTableProps {
  notifications: Notification[];
  onSelectNotification: (notification: Notification) => void;
}

export function NotificationTable({
  notifications,
  onSelectNotification,
}: NotificationTableProps) {
  // Render status badge with accessibility icon and text label
  const renderStatusBadge = (statusStr: string | null) => {
    const s = statusStr?.toLowerCase() || "";
    if (s === "sent") {
      return (
        <Badge className="bg-emerald-500/5 hover:bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" />
          <span>Sent</span>
        </Badge>
      );
    }
    if (s === "failed") {
      return (
        <Badge className="bg-rose-500/5 hover:bg-rose-500/5 text-rose-600 border border-rose-500/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1">
          <AlertCircle className="h-2.5 w-2.5" />
          <span>Failed</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/5 hover:bg-amber-500/5 text-amber-600 border border-amber-500/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1">
        <Clock className="h-2.5 w-2.5" />
        <span>Scheduled</span>
      </Badge>
    );
  };

  // Render channel badge
  const renderChannelBadge = (channelStr: string | null) => {
    const c = channelStr?.toLowerCase() || "";
    let icon = <Mail className="h-2.5 w-2.5" />;
    if (c === "sms") {
      icon = <MessageSquare className="h-2.5 w-2.5" />;
    } else if (c === "whatsapp") {
      icon = <MessageSquare className="h-2.5 w-2.5 text-emerald-600" />;
    }

    return (
      <Badge variant="secondary" className="text-[9px] py-0.5 px-2 bg-muted text-muted-foreground border-none font-semibold capitalize inline-flex items-center gap-1">
        {icon}
        <span>{channelStr || "Email"}</span>
      </Badge>
    );
  };

  // Format date
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Desktop flat table layout */}
      <div className="hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-inner bg-card/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground select-none">
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Ref / Status</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Recipient Type</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Recipient Name</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Channel</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Related Records</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Branch</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Scheduled For</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Sent At</th>
              <th className="p-3 font-semibold tracking-tight text-[10px] uppercase">Created By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {notifications.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelectNotification(row)}
                className="hover:bg-muted/10 transition-colors cursor-pointer"
              >
                {/* Ref & Status */}
                <td className="p-3">
                  <div className="flex flex-col gap-1 align-left">
                    <span className="font-mono font-bold text-foreground/90">{row.notificationId}</span>
                    <div>{renderStatusBadge(row.status)}</div>
                  </div>
                </td>

                {/* Recipient Type */}
                <td className="p-3 text-muted-foreground font-semibold">
                  {row.recipientType}
                </td>

                {/* Recipient Name */}
                <td className="p-3">
                  {row.recipientRestricted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                      <Lock className="h-2.5 w-2.5" />
                      Restricted
                    </span>
                  ) : (
                    <span className="font-bold text-foreground/80">{row.recipientName}</span>
                  )}
                </td>

                {/* Delivery Channel */}
                <td className="p-3">{renderChannelBadge(row.channel)}</td>

                {/* Related record links */}
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1">
                    {row.links.length === 0 ? (
                      <span className="text-muted-foreground/60">—</span>
                    ) : (
                      row.links.map((link) => {
                        if (link.restricted) {
                          return (
                            <span
                              key={link.id}
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10"
                            >
                              <Lock className="h-2 w-2" />
                              Restricted
                            </span>
                          );
                        }

                        // Determine registry path
                        const tableParam = link.type.toLowerCase();
                        const searchParam = encodeURIComponent(link.label);
                        const detailUrl = `/dashboard/owner/${tableParam}?search=${searchParam}`;

                        return (
                          <Link
                            key={link.id}
                            href={detailUrl}
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-1.5 py-0.5 rounded border border-primary/10 transition-all"
                          >
                            <span>{link.type}: {link.label}</span>
                            <ExternalLink className="h-2 w-2" />
                          </Link>
                        );
                      })
                    )}
                  </div>
                </td>

                {/* Branch */}
                <td className="p-3 text-muted-foreground font-medium">{row.branchName}</td>

                {/* Scheduled time */}
                <td className="p-3 font-mono font-medium text-muted-foreground">
                  {formatDateTime(row.scheduledFor)}
                </td>

                {/* Sent time */}
                <td className="p-3 font-mono font-medium text-muted-foreground">
                  {formatDateTime(row.sentAt)}
                </td>

                {/* Created By */}
                <td className="p-3 text-muted-foreground font-semibold">{row.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card list layout */}
      <div className="block md:hidden space-y-4">
        {notifications.map((row) => (
          <Card
            key={row.id}
            onClick={() => onSelectNotification(row)}
            className="border-border bg-card p-4 hover:border-primary/20 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-foreground">{row.notificationId}</span>
              <div className="flex gap-1.5">
                {renderChannelBadge(row.channel)}
                {renderStatusBadge(row.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-muted-foreground font-medium block">Recipient ({row.recipientType})</span>
                {row.recipientRestricted ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-500/5 px-1.5 py-0.2 rounded border border-rose-500/10">
                    <Lock className="h-2.5 w-2.5" />
                    Restricted
                  </span>
                ) : (
                  <span className="font-semibold text-foreground/80">{row.recipientName}</span>
                )}
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Branch</span>
                <span className="font-semibold text-foreground/80">{row.branchName}</span>
              </div>

              <div className="col-span-2">
                <span className="text-muted-foreground font-medium block">Scheduled Time</span>
                <span className="font-mono font-medium text-muted-foreground">{formatDateTime(row.scheduledFor)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
