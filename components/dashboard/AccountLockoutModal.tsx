"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLockedAccountsThunk,
  unlockUserAccountThunk,
  selectLockedAccounts,
  selectLockedLoading,
  selectUnlockingUserId,
} from "@/store/slices/usersSlice";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Lock, Unlock, Clock, ShieldAlert, RefreshCw, CheckCircle2 } from "lucide-react";

interface AccountLockoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlockedSuccess?: () => void;
}

export function AccountLockoutModal({
  open,
  onOpenChange,
  onUnlockedSuccess,
}: AccountLockoutModalProps) {
  const dispatch = useAppDispatch();
  const lockedAccounts = useAppSelector(selectLockedAccounts);
  const loading = useAppSelector(selectLockedLoading);
  const unlockingUserId = useAppSelector(selectUnlockingUserId);

  // Local state for live countdowns
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (open) {
      dispatch(fetchLockedAccountsThunk());
    }
  }, [open, dispatch]);

  // Live timer interval to tick down remaining seconds
  useEffect(() => {
    if (!open || lockedAccounts.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [open, lockedAccounts]);

  const handleUnlock = async (user: { userId: string; fullName: string }) => {
    try {
      const result = await dispatch(unlockUserAccountThunk(user.userId));

      if (unlockUserAccountThunk.fulfilled.match(result)) {
        toast.success(`Account unlocked for ${user.fullName || "User"}!`, {
          description: "The user can now log in immediately.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });
        if (onUnlockedSuccess) {
          onUnlockedSuccess();
        }
      } else {
        const errorMsg = (result.payload as string) || "Failed to unlock account.";
        toast.error(errorMsg);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    }
  };

  const handleRefresh = () => {
    dispatch(fetchLockedAccountsThunk());
  };

  const formatRemainingTime = (lockoutUntil: string | null) => {
    if (!lockoutUntil) return "Expired";
    const expiry = new Date(lockoutUntil).getTime();
    const diffMs = expiry - now;

    if (diffMs <= 0) return "Expired (Pending Refresh)";

    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[calc(100%-2rem)] w-full bg-card border-border shadow-2xl rounded-2xl p-6 sm:p-8 overflow-hidden">
        <DialogHeader className="pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 flex-1 pr-6">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <span>Account Lockout Manager</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-normal">
              Review and manually unlock accounts that were locked out due to multiple failed login attempts.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 px-3 rounded-lg border-border text-xs font-semibold cursor-pointer hover:bg-muted shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading && lockedAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Fetching locked user accounts...
              </p>
            </div>
          ) : lockedAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-xl">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">No Locked Accounts</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  All user accounts are active and functioning normally. No accounts are currently locked out.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-x-auto shadow-xs w-full">
              <Table className="w-full">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-foreground min-w-[180px]">USER DETAILS</TableHead>
                    <TableHead className="text-xs font-bold text-foreground min-w-[90px]">ROLE</TableHead>
                    <TableHead className="text-xs font-bold text-foreground min-w-[130px]">FAILED ATTEMPTS</TableHead>
                    <TableHead className="text-xs font-bold text-foreground min-w-[140px]">REMAINING LOCKOUT</TableHead>
                    <TableHead className="text-xs font-bold text-foreground text-right min-w-[100px]">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockedAccounts.map((account) => {
                    const isUnlocking = unlockingUserId === account.userId;
                    return (
                      <TableRow key={account.userId} className="hover:bg-muted/20">
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                              {account.fullName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {account.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-xs capitalize font-medium">
                            {account.role || "User"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="destructive" className="text-xs font-semibold px-2 py-0.5">
                            {account.loginAttempts} Failed
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-destructive font-medium">
                            <Clock className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span>{formatRemainingTime(account.lockoutUntil)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="default"
                            size="sm"
                            disabled={isUnlocking}
                            onClick={() => handleUnlock(account)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                          >
                            {isUnlocking ? (
                              <>
                                <Spinner className="h-3.5 w-3.5 mr-1.5" />
                                Unlocking...
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3.5 w-3.5 mr-1.5" />
                                Unlock
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
