-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "openedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "workingLanguage" TEXT,
    "status" TEXT,
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "nameRussian" TEXT,
    "nameKyrgyz" TEXT,
    "stage" TEXT,
    "ageBand" TEXT,
    "lessonsPerWeek" DOUBLE PRECISION,
    "defaultCapacity" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuitionPlan" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "billingPeriod" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "courseIds" TEXT[],
    "nameRussian" TEXT,
    "nameKyrgyz" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuitionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT,
    "nameRussian" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION,
    "branchIds" TEXT[],
    "nameRussian" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "inquiryDate" TIMESTAMP(3),
    "channel" TEXT,
    "childAge" DOUBLE PRECISION,
    "preferredLanguage" TEXT,
    "status" TEXT,
    "lostReason" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "notes" TEXT,
    "parentIds" TEXT[],
    "branchIds" TEXT[],
    "ownerIds" TEXT[],
    "lastActivityDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "leadIds" TEXT[],
    "classGroupIds" TEXT[],
    "studentIds" TEXT[],
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmationMethod" TEXT,
    "confirmationDate" TIMESTAMP(3),
    "levelAssessed" TEXT,
    "teacherIds" TEXT[],
    "enrollmentIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "preferredLanguage" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "studentIds" TEXT[],
    "branchIds" TEXT[],
    "whatsappGroupAdded" BOOLEAN NOT NULL DEFAULT false,
    "whatsappGroupName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "parentIds" TEXT[],
    "branchIds" TEXT[],
    "medicalNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassGroup" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "weekdays" TEXT[],
    "startTime" TEXT,
    "capacity" DOUBLE PRECISION,
    "status" TEXT,
    "courseIds" TEXT[],
    "teacherIds" TEXT[],
    "roomIds" TEXT[],
    "termIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "enrollDate" TIMESTAMP(3),
    "status" TEXT,
    "studentIds" TEXT[],
    "classGroupIds" TEXT[],
    "tuitionPlanIds" TEXT[],
    "branchIds" TEXT[],
    "trialFeeDeducted" BOOLEAN NOT NULL DEFAULT false,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractDate" TIMESTAMP(3),
    "hdSystemRegistered" BOOLEAN NOT NULL DEFAULT false,
    "appCredentialsIssued" BOOLEAN NOT NULL DEFAULT false,
    "scheduleDelivered" BOOLEAN NOT NULL DEFAULT false,
    "calendarDelivered" BOOLEAN NOT NULL DEFAULT false,
    "appInstructionsDelivered" BOOLEAN NOT NULL DEFAULT false,
    "audioRecommendationsDelivered" BOOLEAN NOT NULL DEFAULT false,
    "firstLessonConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "firstLessonDate" TIMESTAMP(3),
    "onboardingStatus" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3),
    "status" TEXT,
    "classGroupIds" TEXT[],
    "teacherIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "status" TEXT,
    "sessionIds" TEXT[],
    "studentIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "status" TEXT,
    "parentIds" TEXT[],
    "studentIds" TEXT[],
    "enrollmentIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "method" TEXT,
    "invoiceIds" TEXT[],
    "parentIds" TEXT[],
    "branchIds" TEXT[],
    "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "paymentType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "nameRussian" TEXT,
    "type" TEXT,
    "subType" TEXT,
    "normalSide" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "memo" TEXT,
    "source" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerLine" (
    "id" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "debit" DOUBLE PRECISION,
    "credit" DOUBLE PRECISION,
    "memo" TEXT,
    "journalEntryIds" TEXT[],
    "accountIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "branchIds" TEXT[],
    "nameRussian" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "expenseNo" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "vendorIds" TEXT[],
    "expenseAccountIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseRoyalty" (
    "id" TEXT NOT NULL,
    "royaltyNo" TEXT NOT NULL,
    "period" TIMESTAMP(3),
    "revenueBase" DOUBLE PRECISION,
    "royaltyPercent" DOUBLE PRECISION,
    "marketingFeePercent" DOUBLE PRECISION,
    "status" TEXT,
    "studentsReported" DOUBLE PRECISION,
    "activeCoursesReported" DOUBLE PRECISION,
    "notes" TEXT,
    "branchIds" TEXT[],
    "vendorHQIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseRoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPay" (
    "id" TEXT NOT NULL,
    "payRunNo" TEXT NOT NULL,
    "period" TIMESTAMP(3),
    "payType" TEXT,
    "hours" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "grossPay" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "status" TEXT,
    "datePaid" TIMESTAMP(3),
    "notes" TEXT,
    "teacherIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherHours" (
    "id" TEXT NOT NULL,
    "entry" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "hours" DOUBLE PRECISION,
    "type" TEXT,
    "notes" TEXT,
    "teacherIds" TEXT[],
    "sessionIds" TEXT[],
    "branchIds" TEXT[],
    "payRunIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3),
    "type" TEXT,
    "direction" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "leadIds" TEXT[],
    "ownerIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPerformance" (
    "id" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "channel" TEXT,
    "month" TEXT,
    "branchIds" TEXT[],
    "leads" DOUBLE PRECISION,
    "trialsBooked" DOUBLE PRECISION,
    "trialsAttended" DOUBLE PRECISION,
    "enrolled" DOUBLE PRECISION,
    "lost" DOUBLE PRECISION,
    "lostPrice" DOUBLE PRECISION,
    "lostSchedule" DOUBLE PRECISION,
    "lostLocation" DOUBLE PRECISION,
    "lostWentElsewhere" DOUBLE PRECISION,
    "lostNoResponse" DOUBLE PRECISION,
    "lostOther" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "type" TEXT,
    "channel" TEXT,
    "status" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "message" TEXT,
    "leadIds" TEXT[],
    "parentIds" TEXT[],
    "trialIds" TEXT[],
    "invoiceIds" TEXT[],
    "enrollmentIds" TEXT[],
    "branchIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSecret" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSecret_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "actor_email" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_ids" TEXT,
    "fields" TEXT,
    "result" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

