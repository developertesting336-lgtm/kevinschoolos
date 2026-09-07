"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hooks";
import { touchSessionThunk, logoutThunk } from "@/store/slices/authSlice";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD_MS = 28 * 60 * 1000; // 28 minutes
const TOUCH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between server touches
const CHECK_INTERVAL_MS = 10 * 1000; // Check idle status every 10 seconds

const WARNING_TOAST_ID = "session-timeout-warning";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const lastActivityRef = useRef<number>(Date.now());
  const lastTouchRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    // Reset activity timers on route change
    lastActivityRef.current = Date.now();
    if (warningShownRef.current) {
      toast.dismiss(WARNING_TOAST_ID);
      warningShownRef.current = false;
    }
  }, [pathname]);

  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Dismiss warning toast if user becomes active again
      if (warningShownRef.current) {
        toast.dismiss(WARNING_TOAST_ID);
        warningShownRef.current = false;
        toast.success("Session extended.", { duration: 3000 });
      }

      // Throttle heartbeat touch calls to server via Redux Thunk
      if (now - lastTouchRef.current >= TOUCH_INTERVAL_MS) {
        lastTouchRef.current = now;
        dispatch(touchSessionThunk());
      }
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const idleDuration = Date.now() - lastActivityRef.current;

      // 1. Session timed out -> perform logout via Redux Thunk
      if (idleDuration >= IDLE_TIMEOUT_MS) {
        isLoggingOutRef.current = true;
        if (warningShownRef.current) {
          toast.dismiss(WARNING_TOAST_ID);
        }
        toast.error("Session expired due to 30 minutes of inactivity.", {
          duration: 5000,
        });

        dispatch(logoutThunk())
          .finally(() => {
            router.push("/login?reason=timeout");
          });
        return;
      }

      // 2. Session near timeout -> show warning
      if (idleDuration >= WARNING_THRESHOLD_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        const remainingSeconds = Math.ceil((IDLE_TIMEOUT_MS - idleDuration) / 1000);
        toast.warning(
          `Session Expiring: You have been idle. You will be logged out in ~${Math.ceil(remainingSeconds / 60)} minute(s) due to inactivity.`,
          {
            id: WARNING_TOAST_ID,
            duration: IDLE_TIMEOUT_MS - WARNING_THRESHOLD_MS,
            action: {
              label: "Stay Logged In",
              onClick: () => {
                handleUserActivity();
              },
            },
          }
        );
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [router, dispatch]);

  return <>{children}</>;
}
