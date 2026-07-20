"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import ClassManagementDialog from "./ClassManagementDialog";

export default function ScheduleActions() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Create Class Group
      </button>

      {isOpen && (
        <ClassManagementDialog
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
