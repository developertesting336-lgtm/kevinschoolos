"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginThunk, selectAuthLoading } from "@/store/slices/authSlice";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Clock, ArrowRight, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Lockout banner state
  const [lockoutData, setLockoutData] = useState<{
    isLocked: boolean;
    lockoutUntil: string;
    remainingSeconds: number;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason") === "timeout") {
        toast.error("Your session expired due to 30 minutes of inactivity. Please log in again.", {
          id: "session-timeout-notice",
        });
      }
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutData || lockoutData.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutData((prev) => {
        if (!prev || prev.remainingSeconds <= 1) return null;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLockoutData(null);

      const result = await dispatch(loginThunk({ email, password }));

      if (loginThunk.fulfilled.match(result)) {
        router.push("/dashboard");
      } else {
        const payload = result.payload as any;
        if (payload && typeof payload === "object" && payload.isLocked) {
          setLockoutData({
            isLocked: true,
            lockoutUntil: payload.lockoutUntil,
            remainingSeconds: payload.remainingSeconds || 900,
            error: payload.error || "Account locked due to multiple failed login attempts.",
          });
          toast.error(payload.error || "Account locked due to multiple failed attempts.");
        } else {
          const errorMessage =
            typeof payload === "string" ? payload : "Login failed. Please check credentials.";
          toast.error(errorMessage);
        }
      }
    },
    [email, password, dispatch, router]
  );

  const formatRemainingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 font-sans relative">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl p-2 relative z-10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            School OS
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs mt-1">
            Management Portal Dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {lockoutData && (
            <div className="mb-5 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">
                    Account Temporarily Locked
                  </h4>
                  <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                    {lockoutData.error}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-destructive/20 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-destructive">
                  <Clock className="h-3.5 w-3.5" />
                  Try again in:
                </span>
                <span className="font-mono text-sm font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                  {formatRemainingTime(lockoutData.remainingSeconds)}
                </span>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground text-center">
                  Contact your <strong>Owner</strong> / <strong>Office Admin</strong> to manually unlock your account.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="bg-background border-border text-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-9"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-border text-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || (!!lockoutData && lockoutData.remainingSeconds > 0)}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-primary/10 mt-6 h-9 cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? "Processing..."
                : lockoutData && lockoutData.remainingSeconds > 0
                  ? "Account Locked"
                  : "Access Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}