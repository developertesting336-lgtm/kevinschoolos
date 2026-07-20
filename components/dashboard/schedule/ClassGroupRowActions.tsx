"use client";

import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import EnrollStudentsDialog from "./EnrollStudentsDialog";

interface ClassGroupRowActionsProps {
  classGroupId: string;
  groupName: string;
}

export default function ClassGroupRowActions({ classGroupId, groupName }: ClassGroupRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold transition-all cursor-pointer"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Enroll
      </button>

      {isOpen && (
        <EnrollStudentsDialog
          classGroupId={classGroupId}
          groupName={groupName}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
