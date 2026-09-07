"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  verifyResetTokenThunk,
  resetPasswordThunk,
  selectVerifyTokenLoading,
  selectVerifyTokenValid,
  selectVerifyTokenError,
  selectResetPasswordLoading,
  selectResetPasswordError,
  resetResetPasswordState,
} from "@/store/slices/authSlice";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
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
import { Eye, EyeOff, Check, X, ArrowLeft, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const dispatch = useAppDispatch();
  const isVerifying = useAppSelector(selectVerifyTokenLoading);
  const isTokenValid = useAppSelector(selectVerifyTokenValid);
  const tokenError = useAppSelector(selectVerifyTokenError);
  const isSubmitting = useAppSelector(selectResetPasswordLoading);
  const serverError = useAppSelector(selectResetPasswordError);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (token) {
      dispatch(verifyResetTokenThunk(token));
    }
    return () => {
      dispatch(resetResetPasswordState());
    };
  }, [token, dispatch]);

  // Live password complexity checks
  const complexityChecks = useMemo(() => {
    return [
      { label: "At least 8 characters", pass: newPassword.length >= 8 },
      { label: "At least one uppercase letter (A-Z)", pass: /[A-Z]/.test(newPassword) },
      { label: "At least one lowercase letter (a-z)", pass: /[a-z]/.test(newPassword) },
      { label: "At least one number (0-9)", pass: /[0-9]/.test(newPassword) },
      {
        label: "At least one special character (!@#$%^&*)",
        pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(newPassword),
      },
    ];
  }, [newPassword]);

  const allRulesPassed = useMemo(() => {
    return complexityChecks.every((c) => c.pass);
  }, [complexityChecks]);

  const passwordsMatch = useMemo(() => {
    return newPassword.length > 0 && newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const isFormValid = allRulesPassed && passwordsMatch;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token) {
        toast.error("Invalid token. Please request a new reset link.");
        return;
      }

      const errors = validatePasswordComplexity(newPassword);
      if (errors.length > 0) {
        toast.error("Please ensure all password requirements are met.");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }

      const result = await dispatch(
        resetPasswordThunk({ token, newPassword })
      );

      if (resetPasswordThunk.fulfilled.match(result)) {
        toast.success("Password reset successful! Please log in with your new password.");
        router.push("/login");
      } else {
        const payload = result.payload as { error?: string; errors?: string[] } | undefined;
        toast.error(payload?.error || "Failed to reset password.");
      }
    },
    [token, newPassword, confirmPassword, dispatch, router]
  );

  // Missing or invalid token UI
  if (!token || isTokenValid === false) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Invalid or Expired Link</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {tokenError || "This password reset link is invalid, has already been used, or has expired."}
        </p>
        <div className="pt-4">
          <Link
            href="/forgot-password"
            className="inline-flex items-center text-xs text-primary hover:underline font-medium gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Request a New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  // Token verifying state
  if (isVerifying || isTokenValid === null) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-muted-foreground animate-pulse">Verifying reset token...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* New Password */}
      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-background border-border text-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-9 pr-9"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            aria-label={showNewPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            tabIndex={-1}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Live Complexity Checklist */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs">
        <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider mb-1">
          Password Requirements
        </p>
        {complexityChecks.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {rule.pass ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={rule.pass ? "text-foreground font-medium" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-background border-border text-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-9 pr-9"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-[11px] text-destructive font-medium mt-1">Passwords do not match.</p>
        )}
      </div>

      {serverError && (
        <p className="text-xs text-destructive font-medium">{serverError}</p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !isFormValid}
        className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-primary/10 mt-6 h-9 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? "Resetting Password..." : "Set New Password"}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 font-sans relative">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl p-2 relative z-10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            School OS
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs mt-1 text-center">
            Set Your New Password
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Suspense fallback={<div className="text-center py-8 text-xs text-muted-foreground">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
