"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { User, Lock, Mail, Phone, Building2, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getCsrfHeaders, ensureCsrfToken } from "@/lib/csrf-client";

export interface UserFormData {
  id?: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  branchIds: string[];
  password?: string;
}

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: UserFormData | null;
  branches: { id: string; name: string }[];
  onSuccess: () => void;
}

export function UserManagementModal({
  open,
  onOpenChange,
  userToEdit,
  branches,
  onSuccess,
}: UserManagementModalProps) {
  const isEditing = Boolean(userToEdit?.id);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Teacher");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Active");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchedBranches, setFetchedBranches] = useState<{ id: string; name: string }[]>([]);

  // Fetch branches internally if parent didn't pass any or is loading
  useEffect(() => {
    if (open && (!branches || branches.length === 0)) {
      fetch("/api/data/branch")
        .then((res) => res.json())
        .then((resData) => {
          const list = Array.isArray(resData) ? resData : resData?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setFetchedBranches(
              list.map((b: any) => ({
                id: String(b.id || b._id || ""),
                name: String(b.name || b.branchName || b.id || "Branch"),
              }))
            );
          }
        })
        .catch((err) => console.error("Error fetching branches inside modal:", err));
    }
  }, [open, branches]);

  const activeBranches = branches && branches.length > 0 ? branches : fetchedBranches;

  const branchOptions = React.useMemo(() => {
    if (!Array.isArray(activeBranches)) return [];
    return activeBranches
      .map((b: any) => {
        if (typeof b === "string") return { id: b, name: b };
        const id = String(b.id || b._id || b.branchId || b.name || "");
        const name = String(b.name || b.branchName || b.title || id || "Branch");
        return { id, name };
      })
      .filter((b) => Boolean(b.id));
  }, [activeBranches]);

  const getInitialBranchId = (rawBranchIds: any): string => {
    if (!rawBranchIds) return "";
    if (Array.isArray(rawBranchIds) && rawBranchIds.length > 0) {
      const first = rawBranchIds[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first !== null) return String(first.id || first._id || "");
    }
    if (typeof rawBranchIds === "string") return rawBranchIds;
    return "";
  };

  useEffect(() => {
    if (open) {
      ensureCsrfToken().catch(() => {});
      if (userToEdit) {
        setFullName(userToEdit.fullName || "");
        setRole(userToEdit.role || "Teacher");
        setEmail(userToEdit.email || "");
        setPhone(userToEdit.phone || "");
        setStatus(userToEdit.status || "Active");
        setSelectedBranchId(getInitialBranchId(userToEdit.branchIds));
        setPassword("");
      } else {
        setFullName("");
        setRole("Teacher");
        setEmail("");
        setPhone("");
        setStatus("Active");
        setSelectedBranchId("");
        setPassword("");
      }
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Username / Full Name is required.");
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setErrorMsg("Password is required and must be at least 6 characters.");
      return;
    }

    if (isEditing && password && password.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const csrfToken = await ensureCsrfToken();
      const payload = {
        id: userToEdit?.id,
        fullName: fullName.trim(),
        role: role.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status: status.trim(),
        branchIds: selectedBranchId ? [selectedBranchId] : [],
        password: password.trim() || undefined,
      };

      const res = await fetch("/api/owner/users", {
        method: isEditing ? "PUT" : "POST",
        headers: getCsrfHeaders({ "Content-Type": "application/json" }, csrfToken),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save user.");
      }

      toast.success(
        isEditing
          ? `User "${fullName}" updated successfully.`
          : `User "${fullName}" created successfully.`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" />
            {isEditing ? "Edit User Account" : "Create New User Account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Modify user profile, permissions, status, or reset password."
              : "Register a new team member."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Username / Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Username / Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="e.g. Elena Rostova"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Role & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Role <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                size="sm"
                className="w-full h-9"
              >
                <NativeSelectOption value="Owner">Owner</NativeSelectOption>
                <NativeSelectOption value="Office/Admin">Office/Admin</NativeSelectOption>
                <NativeSelectOption value="Teacher">Teacher</NativeSelectOption>
                <NativeSelectOption value="SMM">SMM</NativeSelectOption>
                <NativeSelectOption value="Cleaner">Cleaner</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground">
                Status
              </Label>
              <NativeSelect
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                size="sm"
                className="w-full h-9"
              >
                <NativeSelectOption value="Active">Active</NativeSelectOption>
                <NativeSelectOption value="Inactive">Inactive</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          {/* Email & Phone Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="elena@helendoron.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+996 555 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Branch Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="branch" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              Branch Assignment
            </Label>
            <NativeSelect
              id="branch"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              size="sm"
              className="w-full h-9"
            >
              <NativeSelectOption value="">No Branch Assigned</NativeSelectOption>
              {branchOptions.map((b, idx) => (
                <NativeSelectOption key={`user-branch-opt-${b.id}-${idx}`} value={b.id}>
                  {b.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {/* Password (Required for create, optional for edit) */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              {isEditing ? "Change Password (Optional)" : "Password"}
              {!isEditing && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={isEditing ? "Leave empty to keep current password" : "Enter minimum 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
            >
              {loading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
