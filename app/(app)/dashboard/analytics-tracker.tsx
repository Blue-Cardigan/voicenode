"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function DashboardAnalyticsTracker({ boardCount }: { boardCount: number }) {
  useEffect(() => {
    track("dashboard_viewed", { boardCount });
  }, [boardCount]);

  return null;
}
