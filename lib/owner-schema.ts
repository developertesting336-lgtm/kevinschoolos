export interface ColumnDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "array";
  sortable?: boolean;
  isComputed?: boolean;
  isReadOnly?: boolean;
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: "select" | "boolean";
  options?: string[]; // Fixed options, if any
}

export interface TableConfig {
  label: string;
  modelName: string;
  columns: ColumnDefinition[];
  searchableFields: string[];
  filterableFields: FilterDefinition[];
  isReadOnlyTable?: boolean;
  isAppendOnlyTable?: boolean;
  defaultSortBy: string;
  defaultSortOrder: "asc" | "desc";
}

export const ownerTablesConfig: Record<string, TableConfig> = {
  branch: {
    label: "Branches",
    modelName: "branch",
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    searchableFields: ["name", "city", "address", "phone", "notes"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "name", label: "Branch Name", type: "string", sortable: true },
      { key: "city", label: "City", type: "string", sortable: true },
      { key: "address", label: "Address", type: "string", sortable: true },
      { key: "phone", label: "Phone", type: "string" },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "openedDate", label: "Opened Date", type: "date", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  user: {
    label: "Users",
    modelName: "user",
    defaultSortBy: "fullName",
    defaultSortOrder: "asc",
    searchableFields: ["fullName", "role", "email", "phone", "workingLanguage", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
      { key: "role", label: "Role", type: "select", options: ["Owner", "Teacher", "SMM", "Office Admin", "Finance", "Tech Admin"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "fullName", label: "Full Name", type: "string", sortable: true },
      { key: "role", label: "Role", type: "string", sortable: true },
      { key: "email", label: "Email", type: "string", sortable: true },
      { key: "phone", label: "Phone", type: "string" },
      { key: "workingLanguage", label: "Working Language", type: "string", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  parent: {
    label: "Parents",
    modelName: "parent",
    defaultSortBy: "parentName",
    defaultSortOrder: "asc",
    searchableFields: ["parentName", "phone", "whatsapp", "email", "address", "notes"],
    filterableFields: [
      { key: "preferredLanguage", label: "Preferred Language", type: "select", options: ["Russian", "Kyrgyz", "English"] },
      { key: "whatsappGroupAdded", label: "WhatsApp Group Added", type: "boolean" }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "parentName", label: "Parent Name", type: "string", sortable: true },
      { key: "phone", label: "Phone", type: "string" },
      { key: "whatsapp", label: "WhatsApp", type: "string" },
      { key: "email", label: "Email", type: "string" },
      { key: "preferredLanguage", label: "Preferred Language", type: "string", sortable: true },
      { key: "address", label: "Address", type: "string" },
      { key: "whatsappGroupAdded", label: "WA Group Added", type: "boolean", sortable: true },
      { key: "whatsappGroupName", label: "WA Group Name", type: "string" },
      { key: "notes", label: "Notes", type: "string" },
      { key: "studentIds", label: "Students", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  student: {
    label: "Students",
    modelName: "student",
    defaultSortBy: "studentName",
    defaultSortOrder: "asc",
    searchableFields: ["studentName", "notes", "medicalNotes", "gender", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Lead", "Trial", "Active", "Paused", "Graduated", "Withdrawn"] },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "studentName", label: "Student Name", type: "string", sortable: true },
      { key: "dateOfBirth", label: "DOB", type: "date", sortable: true },
      { key: "gender", label: "Gender", type: "string", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "medicalNotes", label: "Medical Notes", type: "string" },
      { key: "parentIds", label: "Parents", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  enrollment: {
    label: "Enrollments",
    modelName: "enrollment",
    defaultSortBy: "enrollDate",
    defaultSortOrder: "desc",
    searchableFields: ["enrollmentId", "status", "onboardingStatus"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Active", "Completed", "Withdrawn"] },
      { key: "onboardingStatus", label: "Onboarding Status", type: "select", options: ["Complete", "In Progress", "Pending"] },
      { key: "contractSigned", label: "Contract Signed", type: "boolean" }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "enrollmentId", label: "Enrollment ID", type: "string", sortable: true },
      { key: "enrollDate", label: "Enroll Date", type: "date", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "onboardingStatus", label: "Onboarding Status", type: "string", sortable: true },
      { key: "contractSigned", label: "Contract Signed", type: "boolean", sortable: true },
      { key: "contractDate", label: "Contract Date", type: "date" },
      { key: "trialFeeDeducted", label: "Trial Fee Deducted", type: "boolean" },
      { key: "hdSystemRegistered", label: "HD Registered", type: "boolean" },
      { key: "appCredentialsIssued", label: "App Credentials Issued", type: "boolean" },
      { key: "studentIds", label: "Students", type: "array" },
      { key: "classGroupIds", label: "Class Groups", type: "array" },
      { key: "tuitionPlanIds", label: "Tuition Plans", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  term: {
    label: "Terms",
    modelName: "term",
    defaultSortBy: "termName",
    defaultSortOrder: "asc",
    searchableFields: ["termName", "nameRussian", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Upcoming", "Active", "Closed"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "termName", label: "Term Name", type: "string", sortable: true },
      { key: "nameRussian", label: "Russian Name", type: "string", sortable: true },
      { key: "startDate", label: "Start Date", type: "date", sortable: true },
      { key: "endDate", label: "End Date", type: "date", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  room: {
    label: "Rooms",
    modelName: "room",
    defaultSortBy: "roomName",
    defaultSortOrder: "asc",
    searchableFields: ["roomName", "nameRussian"],
    filterableFields: [],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "roomName", label: "Room Name", type: "string", sortable: true },
      { key: "nameRussian", label: "Russian Name", type: "string", sortable: true },
      { key: "capacity", label: "Capacity", type: "number", sortable: true },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  lead: {
    label: "Leads",
    modelName: "lead",
    defaultSortBy: "inquiryDate",
    defaultSortOrder: "desc",
    searchableFields: ["leadName", "phone", "whatsapp", "notes", "lostReason"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["New", "Contacted", "Trial Booked", "Enrolled", "Lost"] },
      { key: "preferredLanguage", label: "Language", type: "select", options: ["Russian", "Kyrgyz", "English"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "leadName", label: "Lead Name", type: "string", sortable: true },
      { key: "inquiryDate", label: "Inquiry Date", type: "date", sortable: true },
      { key: "phone", label: "Phone", type: "string" },
      { key: "whatsapp", label: "WhatsApp", type: "string" },
      { key: "preferredLanguage", label: "Preferred Language", type: "string", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "lostReason", label: "Lost Reason", type: "string" },
      { key: "notes", label: "Notes", type: "string" },
      { key: "parentIds", label: "Parents", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "ownerIds", label: "Owners", type: "array" },
      { key: "lastActivityDate", label: "Last Activity", type: "date", sortable: true },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  trial: {
    label: "Trials",
    modelName: "trial",
    defaultSortBy: "dateTime",
    defaultSortOrder: "desc",
    searchableFields: ["trialId", "outcome", "notes", "confirmationMethod", "levelAssessed"],
    filterableFields: [
      { key: "confirmationSent", label: "Confirmation Sent", type: "boolean" },
      { key: "outcome", label: "Outcome", type: "select", options: ["Scheduled", "Attended", "No-show", "Converted", "Declined", "Rescheduled"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "trialId", label: "Trial ID", type: "string", sortable: true },
      { key: "dateTime", label: "DateTime", type: "date", sortable: true },
      { key: "outcome", label: "Outcome", type: "string", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "confirmationSent", label: "WA Confirmation", type: "boolean", sortable: true },
      { key: "confirmationMethod", label: "WA Conf. Method", type: "string" },
      { key: "confirmationDate", label: "WA Conf. Date", type: "date" },
      { key: "levelAssessed", label: "Level Assessed", type: "string" },
      { key: "leadIds", label: "Leads", type: "array" },
      { key: "classGroupIds", label: "Class Groups", type: "array" },
      { key: "studentIds", label: "Students", type: "array" },
      { key: "teacherIds", label: "Teachers", type: "array" },
      { key: "enrollmentIds", label: "Enrollments", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  classgroup: {
    label: "Classes",
    modelName: "classGroup",
    defaultSortBy: "groupName",
    defaultSortOrder: "asc",
    searchableFields: ["groupName", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Forming", "Active", "Finished"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "groupName", label: "Class Name", type: "string", sortable: true },
      { key: "weekdays", label: "Weekdays", type: "array" },
      { key: "startTime", label: "Start Time", type: "string" },
      { key: "capacity", label: "Capacity", type: "number", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "courseIds", label: "Courses", type: "array" },
      { key: "teacherIds", label: "Teachers", type: "array" },
      { key: "roomIds", label: "Rooms", type: "array" },
      { key: "termIds", label: "Terms", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  session: {
    label: "Sessions",
    modelName: "session",
    defaultSortBy: "dateTime",
    defaultSortOrder: "desc",
    searchableFields: ["sessionId", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Scheduled", "Held", "Cancelled"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "sessionId", label: "Session ID", type: "string", sortable: true },
      { key: "dateTime", label: "Date & Time", type: "date", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "classGroupIds", label: "Class Groups", type: "array" },
      { key: "teacherIds", label: "Teachers", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  attendance: {
    label: "Attendance",
    modelName: "attendance",
    defaultSortBy: "attendanceId",
    defaultSortOrder: "desc",
    searchableFields: ["attendanceId", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Present", "Absent", "Excused", "Late"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "attendanceId", label: "Attendance ID", type: "string", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "sessionIds", label: "Sessions", type: "array" },
      { key: "studentIds", label: "Students", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  course: {
    label: "Courses",
    modelName: "course",
    defaultSortBy: "courseName",
    defaultSortOrder: "asc",
    searchableFields: ["courseName", "nameRussian", "nameKyrgyz", "description"],
    filterableFields: [
      { key: "active", label: "Active", type: "boolean" }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "courseName", label: "Course Name", type: "string", sortable: true },
      { key: "nameRussian", label: "Russian Name", type: "string" },
      { key: "nameKyrgyz", label: "Kyrgyz Name", type: "string" },
      { key: "stage", label: "Stage", type: "string" },
      { key: "ageBand", label: "Age Band", type: "string" },
      { key: "lessonsPerWeek", label: "Lessons/Week", type: "number", sortable: true },
      { key: "defaultCapacity", label: "Default Capacity", type: "number", sortable: true },
      { key: "active", label: "Active", type: "boolean", sortable: true },
      { key: "description", label: "Description", type: "string" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  tuitionplan: {
    label: "Tuition Plans",
    modelName: "tuitionPlan",
    defaultSortBy: "planName",
    defaultSortOrder: "asc",
    searchableFields: ["planName", "nameRussian", "nameKyrgyz", "billingPeriod"],
    filterableFields: [
      { key: "active", label: "Active", type: "boolean" },
      { key: "billingPeriod", label: "Billing Period", type: "select", options: ["Monthly", "Term", "Annual"] }
    ],
    columns: [
      { key: "planName", label: "Plan Name", type: "string", sortable: true },
      { key: "courseIds", label: "Course", type: "array" },
      { key: "amount", label: "Amount (KGS)", type: "number", sortable: true },
      { key: "netAmount", label: "Net Amount (KGS)", type: "number", sortable: true },
      { key: "billingPeriod", label: "Billing Period", type: "string", sortable: true },
      { key: "discount", label: "Discount", type: "boolean", sortable: true },
      { key: "active", label: "Active", type: "boolean", sortable: true },
      { key: "enrollmentsCount", label: "Enrollments Count", type: "number", isComputed: true },
      { key: "createdAt", label: "Created Date", type: "date", sortable: true }
    ]
  },
  invoice: {
    label: "Invoices",
    modelName: "invoice",
    defaultSortBy: "invoiceNo",
    defaultSortOrder: "desc",
    searchableFields: ["invoiceNo", "status"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Paid", "Unpaid", "Overdue", "Draft", "Cancelled"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "invoiceNo", label: "Invoice No", type: "string", sortable: true },
      { key: "issueDate", label: "Issue Date", type: "date", sortable: true },
      { key: "dueDate", label: "Due Date", type: "date", sortable: true },
      { key: "amount", label: "Amount", type: "number", sortable: true },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "parentIds", label: "Parents", type: "array" },
      { key: "studentIds", label: "Students", type: "array" },
      { key: "enrollmentIds", label: "Enrollments", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  // payment removed — dedicated /dashboard/payments page handles this with Redux + skeleton loader.
  // Do not add back. See app/dashboard/payments/page.tsx.
  account: {
    label: "Chart of Accounts",
    modelName: "account",
    defaultSortBy: "accountNo",
    defaultSortOrder: "asc",
    searchableFields: ["accountNo", "accountName", "nameRussian", "type", "subType", "normalSide", "notes"],
    filterableFields: [
      { key: "active", label: "Active", type: "boolean" },
      { key: "type", label: "Type", type: "select", options: ["Asset", "Liability", "Equity", "Revenue", "Expense"] },
      { key: "normalSide", label: "Normal Side", type: "select", options: ["Debit", "Credit"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "accountNo", label: "Account No", type: "string", sortable: true },
      { key: "accountName", label: "Account Name", type: "string", sortable: true },
      { key: "nameRussian", label: "Russian Name", type: "string" },
      { key: "type", label: "Type", type: "string", sortable: true },
      { key: "subType", label: "Subtype", type: "string", sortable: true },
      { key: "normalSide", label: "Normal Side", type: "string", sortable: true },
      { key: "active", label: "Active", type: "boolean", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  journalentry: {
    label: "Journal Entries",
    modelName: "journalEntry",
    defaultSortBy: "entryNo",
    defaultSortOrder: "desc",
    isAppendOnlyTable: true,
    searchableFields: ["entryNo", "memo", "source"],
    filterableFields: [
      { key: "posted", label: "Posted", type: "boolean" }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "entryNo", label: "Entry No", type: "string", sortable: true },
      { key: "date", label: "Date", type: "date", sortable: true },
      { key: "memo", label: "Memo", type: "string" },
      { key: "source", label: "Source", type: "string" },
      { key: "posted", label: "Posted", type: "boolean", sortable: true, isReadOnly: true },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  ledgerline: {
    label: "Ledger Lines",
    modelName: "ledgerLine",
    defaultSortBy: "line",
    defaultSortOrder: "asc",
    isAppendOnlyTable: true,
    searchableFields: ["line", "memo"],
    filterableFields: [],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "line", label: "Line No", type: "string", sortable: true },
      { key: "debit", label: "Debit", type: "number", sortable: true, isReadOnly: true },
      { key: "credit", label: "Credit", type: "number", sortable: true, isReadOnly: true },
      { key: "memo", label: "Memo", type: "string" },
      { key: "journalEntryIds", label: "Journal Entries", type: "array" },
      { key: "accountIds", label: "Accounts", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  vendor: {
    label: "Vendors",
    modelName: "vendor",
    defaultSortBy: "vendorName",
    defaultSortOrder: "asc",
    searchableFields: ["vendorName", "category", "phone", "email", "notes", "nameRussian"],
    filterableFields: [],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "vendorName", label: "Vendor Name", type: "string", sortable: true },
      { key: "category", label: "Category", type: "string", sortable: true },
      { key: "phone", label: "Phone", type: "string" },
      { key: "email", label: "Email", type: "string" },
      { key: "nameRussian", label: "Russian Name", type: "string" },
      { key: "notes", label: "Notes", type: "string" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  expense: {
    label: "Expenses",
    modelName: "expense",
    defaultSortBy: "expenseNo",
    defaultSortOrder: "desc",
    searchableFields: ["expenseNo", "description", "paymentMethod", "notes"],
    filterableFields: [
      { key: "paid", label: "Paid", type: "boolean" },
      { key: "paymentMethod", label: "Payment Method", type: "select", options: ["Cash", "Bank Transfer", "HQ Payment", "Card"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "expenseNo", label: "Expense No", type: "string", sortable: true },
      { key: "date", label: "Date", type: "date", sortable: true },
      { key: "description", label: "Description", type: "string" },
      { key: "amount", label: "Amount", type: "number", sortable: true },
      { key: "paymentMethod", label: "Payment Method", type: "string", sortable: true },
      { key: "paid", label: "Paid", type: "boolean", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "vendorIds", label: "Vendors", type: "array" },
      { key: "expenseAccountIds", label: "Accounts", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  franchiseroyalty: {
    label: "Franchise Royalties",
    modelName: "franchiseRoyalty",
    defaultSortBy: "royaltyNo",
    defaultSortOrder: "desc",
    searchableFields: ["royaltyNo", "status", "notes"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Draft", "Submitted", "Paid", "Pending"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "royaltyNo", label: "Royalty No", type: "string", sortable: true },
      { key: "period", label: "Period", type: "date", sortable: true },
      { key: "revenueBase", label: "Revenue Base", type: "number", sortable: true },
      { key: "royaltyPercent", label: "Royalty %", type: "number" },
      { key: "marketingFeePercent", label: "Marketing %", type: "number" },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "studentsReported", label: "Students Reported", type: "number" },
      { key: "activeCoursesReported", label: "Courses Reported", type: "number" },
      { key: "notes", label: "Notes", type: "string" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "vendorHQIds", label: "Vendors HQ", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  teacherpay: {
    label: "Teacher Pay",
    modelName: "teacherPay",
    defaultSortBy: "payRunNo",
    defaultSortOrder: "desc",
    searchableFields: ["payRunNo", "payType", "paymentMethod", "status", "notes"],
    filterableFields: [
      { key: "status", label: "Status", type: "select", options: ["Draft", "Approved", "Paid"] },
      { key: "payType", label: "Pay Type", type: "select", options: ["Hourly", "Salary", "Bonus"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "payRunNo", label: "Pay Run No", type: "string", sortable: true },
      { key: "period", label: "Period", type: "date", sortable: true },
      { key: "payType", label: "Pay Type", type: "string" },
      { key: "hours", label: "Hours", type: "number", sortable: true },
      { key: "rate", label: "Rate", type: "number", sortable: true },
      { key: "grossPay", label: "Gross Pay (Computed)", type: "number", sortable: true, isComputed: true, isReadOnly: true },
      { key: "paymentMethod", label: "Payment Method", type: "string" },
      { key: "status", label: "Status", type: "string", sortable: true },
      { key: "datePaid", label: "Date Paid", type: "date", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "teacherIds", label: "Teachers", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  teacherhours: {
    label: "Teacher Hours",
    modelName: "teacherHours",
    defaultSortBy: "date",
    defaultSortOrder: "desc",
    searchableFields: ["entry", "type", "notes"],
    filterableFields: [
      { key: "type", label: "Type", type: "select", options: ["Lesson", "Preparation", "Meeting", "Subbing"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "entry", label: "Entry", type: "string", sortable: true },
      { key: "date", label: "Date", type: "date", sortable: true },
      { key: "hours", label: "Hours", type: "number", sortable: true },
      { key: "type", label: "Type", type: "string", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "teacherIds", label: "Teachers", type: "array" },
      { key: "sessionIds", label: "Sessions", type: "array" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "payRunIds", label: "Pay Run IDs", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  activity: {
    label: "Activities",
    modelName: "activity",
    defaultSortBy: "dateTime",
    defaultSortOrder: "desc",
    searchableFields: ["activityId", "type", "direction", "outcome", "notes"],
    filterableFields: [
      { key: "type", label: "Type", type: "select", options: ["Call", "WhatsApp", "Email", "SMS", "Walk-in", "Trial Follow-up", "Other", "Consultation"] },
      { key: "direction", label: "Direction", type: "select", options: ["Inbound", "Outbound"] },
      { key: "outcome", label: "Outcome", type: "select", options: ["Reached", "No Answer", "Left VM", "Scheduled Trial", "Requested Callback", "Not Interested"] }
    ],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "activityId", label: "Activity ID", type: "string", sortable: true },
      { key: "dateTime", label: "Date & Time", type: "date", sortable: true },
      { key: "type", label: "Type", type: "string", sortable: true },
      { key: "direction", label: "Direction", type: "string", sortable: true },
      { key: "outcome", label: "Outcome", type: "string", sortable: true },
      { key: "notes", label: "Notes", type: "string" },
      { key: "nextFollowUpDate", label: "Next Follow-Up", type: "date", sortable: true },
      { key: "leadIds", label: "Leads", type: "array" },
      { key: "ownerIds", label: "Owners", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  },
  channelperformance: {
    label: "Channel Performance",
    modelName: "channelPerformance",
    defaultSortBy: "month",
    defaultSortOrder: "desc",
    isReadOnlyTable: true,
    searchableFields: ["channel", "month"],
    filterableFields: [],
    columns: [
      { key: "id", label: "ID", type: "string" },
      { key: "rowKey", label: "Row Key", type: "string" },
      { key: "channel", label: "Channel", type: "string", sortable: true },
      { key: "month", label: "Month", type: "string", sortable: true },
      { key: "leads", label: "Leads", type: "number", sortable: true },
      { key: "trialsBooked", label: "Trials Booked", type: "number", sortable: true },
      { key: "trialsAttended", label: "Trials Attended", type: "number", sortable: true },
      { key: "enrolled", label: "Enrolled", type: "number", sortable: true },
      { key: "lost", label: "Lost", type: "number", sortable: true },
      { key: "lostPrice", label: "Lost - Price", type: "number" },
      { key: "lostSchedule", label: "Lost - Schedule", type: "number" },
      { key: "lostLocation", label: "Lost - Location", type: "number" },
      { key: "lostWentElsewhere", label: "Lost - Elsewhere", type: "number" },
      { key: "lostNoResponse", label: "Lost - No Response", type: "number" },
      { key: "lostOther", label: "Lost - Other", type: "number" },
      { key: "branchIds", label: "Branches", type: "array" },
      { key: "updatedAt", label: "Last Updated", type: "date", sortable: true }
    ]
  }
};
