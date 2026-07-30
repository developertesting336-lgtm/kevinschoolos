-- Drop table if it exists with incorrect column casing
DROP TABLE IF EXISTS "ExpenseApproval";

-- Create ExpenseApproval table
CREATE TABLE "ExpenseApproval" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expenseId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'Pending Approval',
  "approvedById" TEXT,
  "approvedDate" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "ExpenseApproval_expenseId_idx" ON "ExpenseApproval"("expenseId");
CREATE INDEX IF NOT EXISTS "ExpenseApproval_status_idx" ON "ExpenseApproval"("status");