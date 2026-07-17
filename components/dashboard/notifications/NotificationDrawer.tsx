"use client";

import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageSquare,
  Lock,
  ExternalLink,
  Info,
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

interface NotificationDrawerProps {
  notification: Notification | null;
  onClose: () => void;
}

export function NotificationDrawer({
  notification,
  onClose,
}: NotificationDrawerProps) {
  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (notification) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [notification]);

  if (!notification) return null;

  const renderStatusBadge = (statusStr: string | null) => {
    const s = statusStr?.toLowerCase() || "";
    if (s === "sent") {
      return (
        <Badge className="bg-emerald-500/5 hover:bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          <span>Sent</span>
        </Badge>
      );
    }
    if (s === "failed") {
      return (
        <Badge className="bg-rose-500/5 hover:bg-rose-500/5 text-rose-600 border border-rose-500/10 px-3 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          <span>Failed</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/5 hover:bg-amber-500/5 text-amber-600 border border-amber-500/10 px-3 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        <span>Scheduled</span>
      </Badge>
    );
  };

  const renderChannelBadge = (channelStr: string | null) => {
    const c = channelStr?.toLowerCase() || "";
    let icon = <Mail className="h-3 w-3" />;
    if (c === "sms") {
      icon = <MessageSquare className="h-3 w-3" />;
    } else if (c === "whatsapp") {
      icon = <MessageSquare className="h-3 w-3 text-emerald-600" />;
    }

    return (
      <Badge variant="secondary" className="text-[10px] py-1 px-3 bg-muted text-muted-foreground border-none font-bold capitalize inline-flex items-center gap-1.5">
        {icon}
        <span>{channelStr || "Email"}</span>
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container (Slides out from right on desktop, fullscreen on mobile) */}
      <div className="relative w-full sm:max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-350 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 shrink-0">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">
              Reference: {notification.notificationId}
            </div>
            <h3 className="text-sm font-extrabold text-foreground mt-0.5">
              Notification Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status section */}
          <div className="flex items-center gap-3 bg-muted/10 border border-border/40 p-4 rounded-xl">
            {renderStatusBadge(notification.status)}
            {renderChannelBadge(notification.channel)}
          </div>

          {/* Details list */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
              Metadata Parameters
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground font-medium block">Recipient Type</span>
                <span className="font-bold text-foreground/80 mt-0.5 block">
                  {notification.recipientType}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Recipient Name</span>
                {notification.recipientRestricted ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 mt-0.5">
                    <Lock className="h-2 w-2" />
                    Restricted
                  </span>
                ) : (
                  <span className="font-bold text-foreground/85 mt-0.5 block">
                    {notification.recipientName}
                  </span>
                )}
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Branch</span>
                <span className="font-bold text-foreground/80 mt-0.5 block">
                  {notification.branchName}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Created By</span>
                <span className="font-bold text-foreground/80 mt-0.5 block">
                  {notification.createdBy}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Scheduled For</span>
                <span className="font-mono font-semibold text-muted-foreground mt-0.5 block">
                  {notification.scheduledFor ? new Date(notification.scheduledFor).toLocaleString() : "—"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block">Sent At</span>
                <span className="font-mono font-semibold text-muted-foreground mt-0.5 block">
                  {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Failure description if failed */}
          {notification.status?.toLowerCase() === "failed" && (
            <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Delivery Failure Reason</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-normal font-semibold">
                Invalid recipient phone or email format. Delivery attempt blocked by gateway handler.
              </p>
            </div>
          )}

          {/* Related Links */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
              Linked Records
            </h4>

            {notification.links.length === 0 ? (
              <span className="text-xs text-muted-foreground/60 font-semibold block italic">
                No linked entity references.
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {notification.links.map((link) => {
                  if (link.restricted) {
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between border border-rose-500/10 bg-rose-500/5 px-3 py-2 rounded-xl text-xs"
                      >
                        <span className="font-bold text-muted-foreground">{link.type} Reference</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/15">
                          <Lock className="h-2.5 w-2.5" />
                          Restricted
                        </span>
                      </div>
                    );
                  }

                  const tableParam = link.type.toLowerCase();
                  const searchParam = encodeURIComponent(link.label);
                  const detailUrl = `/dashboard/owner/${tableParam}?search=${searchParam}`;

                  return (
                    <Link
                      key={link.id}
                      href={detailUrl}
                      className="flex items-center justify-between border border-border/60 hover:border-primary/20 bg-muted/10 hover:bg-primary/5 p-3 rounded-xl text-xs transition-all duration-300 group"
                    >
                      <span className="font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        {link.type} Reference
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                        <span>{link.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rendered message preview box */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
              Rendered Message Body
            </h4>

            <div className="border border-border/60 bg-muted/20 p-4 rounded-xl shadow-inner font-sans text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap select-text wrap-break-word">
              {notification.message || "—"}
            </div>
            
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-semibold">
              <Info className="h-3 w-3" />
              <span>This message body is generated and rendered as static read-only data.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
