"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  forgotPasswordThunk,
  selectForgotPasswordLoading,
  selectForgotPasswordSuccess,
  selectForgotPasswordMessage,
  selectForgotPasswordError,
  resetForgotPasswordState,
} from "@/store/slices/authSlice";
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
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectForgotPasswordLoading);
  const isSuccess = useAppSelector(selectForgotPasswordSuccess);
  const successMessage = useAppSelector(selectForgotPasswordMessage);
  const error = useAppSelector(selectForgotPasswordError);

  const [email, setEmail] = useState("");

  useEffect(() => {
    return () => {
      dispatch(resetForgotPasswordState());
    };
  }, [dispatch]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;

      const result = await dispatch(forgotPasswordThunk({ email: email.trim() }));
      if (forgotPasswordThunk.rejected.match(result)) {
        const errMsg = (result.payload as string) || "Failed to send reset link.";
        toast.error(errMsg);
      }
    },
    [email, dispatch]
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 font-sans relative">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl p-2 relative z-10">
        <CardHeader className="flex flex-col items-center pt-8 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            School OS
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs mt-1 text-center">
            Reset Your Password
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {isSuccess ? (
            <div className="space-y-4 text-center py-2">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Check your inbox</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {successMessage || "If that email exists, a reset link has been sent."}
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs text-primary hover:underline font-medium gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your registered email address and we will send you a single-use link to reset your password.
              </p>

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

              {error && (
                <p className="text-xs text-destructive font-medium">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-primary/10 mt-6 h-9 cursor-pointer"
              >
                {isLoading ? "Sending Link..." : "Send Reset Link"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
