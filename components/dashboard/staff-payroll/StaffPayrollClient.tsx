"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStaffPayrollData,
  submitStaffPaymentThunk,
  setFilters,
  setPage,
  selectStaffPayrollData,
  selectStaffPayrollTotalCount,
  selectStaffPayrollCurrentPage,
  selectStaffPayrollTotalPages,
  selectStaffPayrollLoading,
  selectStaffPayrollSubmitting,
  selectStaffPayrollError,
  selectStaffPayrollIsForbidden,
  selectStaffPayrollFilters,
  StaffPayrollItem,
  SubmitPaymentPayload,
} from "@/store/slices/staffPayrollSlice";

import { StaffPayrollFilters } from "./StaffPayrollFilters";
import { StaffPayrollTable } from "./StaffPayrollTable";
import { SubmitPaymentModal } from "./SubmitPaymentModal";
import { toast } from "sonner";
import { Wallet, ShieldAlert } from "lucide-react";

export function StaffPayrollClient() {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectStaffPayrollData);
  const totalCount = useAppSelector(selectStaffPayrollTotalCount);
  const currentPage = useAppSelector(selectStaffPayrollCurrentPage);
  const totalPages = useAppSelector(selectStaffPayrollTotalPages);
  const loading = useAppSelector(selectStaffPayrollLoading);
  const submitting = useAppSelector(selectStaffPayrollSubmitting);
  const error = useAppSelector(selectStaffPayrollError);
  const isForbidden = useAppSelector(selectStaffPayrollIsForbidden);
  const filters = useAppSelector(selectStaffPayrollFilters);

  // Local state for instant typing search input
  const [searchInput, setSearchInput] = useState<string>(filters.search);
  const [selectedStaffItem, setSelectedStaffItem] = useState<StaffPayrollItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 1. Debounce Search Input (300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setFilters({ search: searchInput }));
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, filters.search, dispatch]);

  // 2. Fetch Data whenever filters or currentPage change
  useEffect(() => {
    dispatch(fetchStaffPayrollData({ page: currentPage }));
  }, [dispatch, currentPage, filters.search, filters.period, filters.role]);

  // 3. Handle Period Change
  const handlePeriodChange = useCallback(
    (newPeriod: string) => {
      dispatch(setFilters({ period: newPeriod }));
    },
    [dispatch]
  );

  // 4. Handle Role Change
  const handleRoleChange = useCallback(
    (newRole: string) => {
      dispatch(setFilters({ role: newRole }));
    },
    [dispatch]
  );

  // 5. Handle Page Change
  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setPage(newPage));
    },
    [dispatch]
  );

  // 6. Handle Modal Actions
  const handleOpenSubmitModal = useCallback((item: StaffPayrollItem) => {
    setSelectedStaffItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedStaffItem(null);
  }, []);

  // 7. Handle Payment Submission with Toast Feedback & Error Safeguard
  const handleSubmitPayment = async (payload: SubmitPaymentPayload) => {
    try {
      const resultAction = await dispatch(submitStaffPaymentThunk(payload));
      if (submitStaffPaymentThunk.fulfilled.match(resultAction)) {
        toast.success(`Payment processed successfully as Paid!`, {
          description: `Pay Run No: ${resultAction.payload?.data?.payRunNo || "PAY-RECORD"}`,
        });
        handleCloseModal();
      } else {
        const errorMsg = (resultAction.payload as string) || "Failed to process payment.";
        toast.error("Payment Submission Failed", { description: errorMsg });
      }
    } catch (err: any) {
      toast.error("Error Processing Payment", {
        description: err?.message || "An unexpected error occurred.",
      });
    }
  };

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl text-center my-8 shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Staff Payroll management is strictly accessible only to Owner and Office/Admin roles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Wallet className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Payroll</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage monthly salary runs, payment statuses, and journal entries for Teachers, Cleaners, and SMM staff.
          </p>
        </div>
      </div>

      {/* Global Error Banner if any */}
      {error && !isForbidden && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button
            onClick={() => dispatch(fetchStaffPayrollData())}
            className="text-xs underline hover:text-rose-900 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Component */}
      <StaffPayrollFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        period={filters.period}
        onPeriodChange={handlePeriodChange}
        role={filters.role}
        onRoleChange={handleRoleChange}
      />

      {/* Table Component */}
      <StaffPayrollTable
        data={data}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onOpenSubmitModal={handleOpenSubmitModal}
      />

      {/* Payment Form Modal */}
      <SubmitPaymentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        staffItem={selectedStaffItem}
        currentPeriod={filters.period}
        submitting={submitting}
        onSubmit={handleSubmitPayment}
      />
    </div>
  );
}
