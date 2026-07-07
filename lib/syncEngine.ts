import { airtableBase } from "./airtable";
import prisma from "./prisma";

// Safe helper functions for typecasting
const getStr = (val: any): string | null =>
  typeof val === "string" ? val : val ? String(val) : null;
const getNum = (val: any): number | null =>
  typeof val === "number"
    ? val
    : val && !isNaN(Number(val))
      ? Number(val)
      : null;
const getBool = (val: any): boolean => !!val;
const getArr = (val: any): string[] =>
  Array.isArray(val) ? val.map(String) : [];
const getDate = (val: any): Date | null => (val ? new Date(val) : null);

// Table configuration object including the Airtable Table ID
export const SYNC_CONFIGS: {
  airtableTableId: string;
  airtableTable: string;
  prismaModel: string;
  mapFields: (recordId: string, fields: any) => any;
}[] = [
  {
    airtableTableId: "tbl2utdNdP9usMXLf",
    airtableTable: "01 Branches / Филиалы",
    prismaModel: "branch",
    mapFields: (id, f) => ({
      id,
      name: getStr(f["Branch Name / Название филиала"]) || "Unnamed Branch",
      city: getStr(f["City / Город"]),
      address: getStr(f["Address / Адрес"]),
      phone: getStr(f["Phone / Телефон"]),
      status: getStr(f["Status / Статус"]),
      notes: getStr(f["Notes / Заметки"]),
      openedDate: getDate(f["Opened Date / Дата открытия"]),
    }),
  },
  {
    airtableTableId: "tblUkEhqFJBFTvRN5",
    airtableTable: "02 Users / Сотрудники",
    prismaModel: "user",
    mapFields: (id, f) => ({
      id,
      fullName: getStr(f["Full Name / ФИО"]) || "Unnamed User",
      role: getStr(f["Role / Роль"]),
      email: getStr(f["Email / Эл. почта"]),
      phone: getStr(f["Phone / Телефон"]),
      workingLanguage: getStr(f["Working Language / Рабочий язык"]),
      status: getStr(f["Status / Статус"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblgvltY5JtmMZs1q",
    airtableTable: "03 Courses / Курсы",
    prismaModel: "course",
    mapFields: (id, f) => ({
      id,
      courseName: getStr(f["Course Name / Название курса"]) || "Unnamed Course",
      nameRussian: getStr(f["Name (Russian)"]),
      nameKyrgyz: getStr(f["Name (Kyrgyz)"]),
      stage: getStr(f["Stage / Ступень"]),
      ageBand: getStr(f["Age Band / Возраст"]),
      lessonsPerWeek: getNum(f["Lessons per Week / Уроков в неделю"]),
      defaultCapacity: getNum(f["Default Capacity / Вместимость по умолчанию"]),
      active: getBool(f["Active / Активен"]),
      description: getStr(f["Description / Описание"]),
    }),
  },
  {
    airtableTableId: "tbldiIHLyH7bup2XG",
    airtableTable: "04 Tuition Plans / Тарифные планы",
    prismaModel: "tuitionPlan",
    mapFields: (id, f) => ({
      id,
      planName: getStr(f["Plan Name / Тарифный план"]) || "Unnamed Plan",
      amount: getNum(f["Amount (KGS) / Сумма (сом)"]),
      billingPeriod: getStr(f["Billing Period / Период оплаты"]),
      active: getBool(f["Active / Активен"]),
      courseIds: getArr(f["Course"]),
      nameRussian: getStr(f["Name (Russian) / Название"]),
      nameKyrgyz: getStr(f["Name (Kyrgyz) / Аталышы"]),
    }),
  },
  {
    airtableTableId: "tblVSaneGtUOq5Xzr",
    airtableTable: "05 Terms / Учебные периоды",
    prismaModel: "term",
    mapFields: (id, f) => ({
      id,
      termName: getStr(f["Term Name / Учебный период"]) || "Unnamed Term",
      startDate: getDate(f["Start Date / Дата начала"]),
      endDate: getDate(f["End Date / Дата окончания"]),
      status: getStr(f["Status / Статус"]),
      nameRussian: getStr(f["Name (Russian) / Название"]),
    }),
  },
  {
    airtableTableId: "tblunCF2EX30onveH",
    airtableTable: "06 Rooms / Кабинеты",
    prismaModel: "room",
    mapFields: (id, f) => ({
      id,
      roomName: getStr(f["Room Name / Кабинет"]) || "Unnamed Room",
      capacity: getNum(f["Capacity / Вместимость"]),
      branchIds: getArr(f["Branch"]),
      nameRussian: getStr(f["Name (Russian) / Название"]),
    }),
  },
  {
    airtableTableId: "tblItZ3B7d4YRO9ih",
    airtableTable: "07 Leads / Лиды",
    prismaModel: "lead",
    mapFields: (id, f) => ({
      id,
      leadName: getStr(f["Lead Name / Имя лида"]) || "Unnamed Lead",
      inquiryDate: getDate(f["Inquiry Date / Дата обращения"]),
      channel: getStr(f["Channel / Канал"]),
      childAge: getNum(f["Child Age / Возраст ребёнка"]),
      preferredLanguage: getStr(f["Preferred Language / Предпочитаемый язык"]),
      status: getStr(f["Status / Статус"]),
      lostReason: getStr(f["Lost Reason / Причина отказа"]),
      phone: getStr(f["Phone / Телефон"]),
      whatsapp: getStr(f["WhatsApp / WhatsApp"]),
      notes: getStr(f["Notes / Заметки"]),
      parentIds: getArr(f["Parent"]),
      branchIds: getArr(f["Branch"]),
      ownerIds: getArr(f["Owner"]),
      lastActivityDate: getDate(f["Last Activity Date"]),
    }),
  },
  {
    airtableTableId: "tblfvl5TjmWtr24Yp",
    airtableTable: "08 Trials / Пробные уроки",
    prismaModel: "trial",
    mapFields: (id, f) => ({
      id,
      trialId: getStr(f["Trial ID / ID пробного"]) || "Unnamed Trial",
      dateTime: getDate(f["Date/Time / Дата/время"]),
      outcome: getStr(f["Outcome / Результат"]),
      notes: getStr(f["Notes / Заметки"]),
      leadIds: getArr(f["Lead"]),
      classGroupIds: getArr(f["Class Group"]),
      studentIds: getArr(f["Student (if enrolled)"]),
      confirmationSent: getBool(
        f["Confirmation Sent / Подтверждение отправлено"],
      ),
      confirmationMethod: getStr(
        f["Confirmation Method / Способ подтверждения"],
      ),
      confirmationDate: getDate(f["Confirmation Date / Дата подтверждения"]),
      levelAssessed: getStr(f["Level Assessed / Оцененный уровень"]),
      teacherIds: getArr(f["Teacher / Преподаватель"]),
      enrollmentIds: getArr(f["Enrollment / Зачисление"]),
    }),
  },
  {
    airtableTableId: "tblRJNw4S6o1WPjBI",
    airtableTable: "09 Parents / Родители",
    prismaModel: "parent",
    mapFields: (id, f) => ({
      id,
      parentName: getStr(f["Parent Name / ФИО родителя"]) || "Unnamed Parent",
      phone: getStr(f["Phone / Телефон"]),
      whatsapp: getStr(f["WhatsApp / WhatsApp"]),
      email: getStr(f["Email / Эл. почта"]),
      preferredLanguage: getStr(f["Preferred Language / Предпочитаемый язык"]),
      address: getStr(f["Address / Адрес"]),
      notes: getStr(f["Notes / Заметки"]),
      studentIds: getArr(f["Students"]),
      branchIds: getArr(f["Branch"]),
      whatsappGroupAdded: getBool(
        f["WhatsApp Group Added / Добавлен в группу"],
      ),
      whatsappGroupName: getStr(f["WhatsApp Group Name / Название группы"]),
    }),
  },
  {
    airtableTableId: "tbl9Ddw4uRQ3i6e1B",
    airtableTable: "10 Students / Ученики",
    prismaModel: "student",
    mapFields: (id, f) => ({
      id,
      studentName: getStr(f["Student Name / ФИО ученика"]) || "Unnamed Student",
      dateOfBirth: getDate(f["Date of Birth / Дата рождения"]),
      gender: getStr(f["Gender / Пол"]),
      status: getStr(f["Status / Статус"]),
      notes: getStr(f["Notes / Заметки"]),
      parentIds: getArr(f["Parent"]),
      branchIds: getArr(f["Branch"]),
      medicalNotes: getStr(f["Medical Notes / Медицинские заметки"]),
    }),
  },
  {
    airtableTableId: "tblpUJni7tMvO2QBs",
    airtableTable: "11 Class Groups / Группы",
    prismaModel: "classGroup",
    mapFields: (id, f) => ({
      id,
      groupName: getStr(f["Group Name / Название группы"]) || "Unnamed Group",
      weekdays: getArr(f["Weekdays / Дни недели"]),
      startTime: getStr(f["Start Time / Время начала"]),
      capacity: getNum(f["Capacity / Вместимость"]),
      status: getStr(f["Status / Статус"]),
      courseIds: getArr(f["Course"]),
      teacherIds: getArr(f["Teacher"]),
      roomIds: getArr(f["Room"]),
      termIds: getArr(f["Term"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblVA5O7fnBx5cAnJ",
    airtableTable: "12 Enrollments / Зачисления",
    prismaModel: "enrollment",
    mapFields: (id, f) => ({
      id,
      enrollmentId:
        getStr(f["Enrollment ID / ID зачисления"]) || "Unnamed Enrollment",
      enrollDate: getDate(f["Enroll Date / Дата зачисления"]),
      status: getStr(f["Status / Статус"]),
      studentIds: getArr(f["Student"]),
      classGroupIds: getArr(f["Class Group"]),
      tuitionPlanIds: getArr(f["Tuition Plan"]),
      branchIds: getArr(f["Branch"]),
      trialFeeDeducted: getBool(f["Trial Fee Deducted / Пробный зачтён"]),
      contractSigned: getBool(f["Contract Signed / Договор подписан"]),
      contractDate: getDate(f["Contract Date / Дата договора"]),
      hdSystemRegistered: getBool(
        f["HD System Registered / Зарегистрирован в HD"],
      ),
      appCredentialsIssued: getBool(f["App Credentials Issued / Доступ выдан"]),
      scheduleDelivered: getBool(f["Schedule Delivered / Расписание передано"]),
      calendarDelivered: getBool(f["Calendar Delivered / Календарь передан"]),
      appInstructionsDelivered: getBool(
        f["App Instructions Delivered / Инструкции переданы"],
      ),
      audioRecommendationsDelivered: getBool(
        f["Audio Recommendations Delivered / Аудио-рекомендации переданы"],
      ),
      firstLessonConfirmed: getBool(
        f["First Lesson Confirmed / Первый урок подтверждён"],
      ),
      firstLessonDate: getDate(f["First Lesson Date / Дата первого урока"]),
      onboardingStatus: getStr(f["Onboarding Status / Статус адаптации"]),
    }),
  },
  {
    airtableTableId: "tblUE4gfr8en6lfUS",
    airtableTable: "13 Sessions / Занятия",
    prismaModel: "session",
    mapFields: (id, f) => ({
      id,
      sessionId: getStr(f["Session ID / ID занятия"]) || "Unnamed Session",
      dateTime: getDate(f["Date/Time / Дата/время"]),
      status: getStr(f["Status / Статус"]),
      classGroupIds: getArr(f["Class Group"]),
      teacherIds: getArr(f["Teacher"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblbOAIuMZHgtsjEP",
    airtableTable: "14 Attendance / Посещаемость",
    prismaModel: "attendance",
    mapFields: (id, f) => ({
      id,
      attendanceId:
        getStr(f["Attendance ID / ID посещаемости"]) || "Unnamed Attendance",
      status: getStr(f["Status / Статус"]),
      sessionIds: getArr(f["Session"]),
      studentIds: getArr(f["Student"]),
    }),
  },
  {
    airtableTableId: "tblTB6N6jNqSFvEER",
    airtableTable: "15 Invoices / Счета",
    prismaModel: "invoice",
    mapFields: (id, f) => ({
      id,
      invoiceNo: getStr(f["Invoice No / Номер счёта"]) || "Unnamed Invoice",
      issueDate: getDate(f["Issue Date / Дата выставления"]),
      dueDate: getDate(f["Due Date / Срок оплаты"]),
      amount: getNum(f["Amount (KGS) / Сумма (сом)"]),
      status: getStr(f["Status / Статус"]),
      parentIds: getArr(f["Parent"]),
      studentIds: getArr(f["Student"]),
      enrollmentIds: getArr(f["Enrollment"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tbliFcGpMbqnMaD9S",
    airtableTable: "16 Payments / Платежи",
    prismaModel: "payment",
    mapFields: (id, f) => ({
      id,
      paymentRef:
        getStr(f["Payment Ref / Назначение платежа"]) || "Unnamed Payment",
      date: getDate(f["Date / Дата"]),
      amount: getNum(f["Amount (KGS) / Сумма (сом)"]),
      method: getStr(f["Method / Способ оплаты"]),
      invoiceIds: getArr(f["Invoice"]),
      parentIds: getArr(f["Parent"]),
      branchIds: getArr(f["Branch"]),
      possibleDuplicate: getBool(f["Possible Duplicate / Возможный дубль"]),
      paymentType: getStr(f["Payment Type / Тип платежа"]),
    }),
  },
  {
    airtableTableId: "tblLkuBm7zVJKpzzu",
    airtableTable: "17 Chart of Accounts / План счетов",
    prismaModel: "account",
    mapFields: (id, f) => ({
      id,
      accountNo: getStr(f["Account No / Номер счёта"]) || "Unnamed Account",
      accountName:
        getStr(f["Account Name / Название счёта"]) || "Unnamed Account",
      nameRussian: getStr(f["Name (Russian)"]),
      type: getStr(f["Type / Тип"]),
      subType: getStr(f["Sub-type / Подтип"]),
      normalSide: getStr(f["Normal Side / Но保留"]),
      active: getBool(f["Active / Активен"]),
      notes: getStr(f["Notes / Заметки"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblRf3mdeZmzp2mnf",
    airtableTable: "18 Journal Entries / Журнальные записи",
    prismaModel: "journalEntry",
    mapFields: (id, f) => ({
      id,
      entryNo: getStr(f["Entry No / Номер записи"]) || "Unnamed Entry",
      date: getDate(f["Date / Дата"]),
      memo: getStr(f["Memo / Назначение"]),
      source: getStr(f["Source / Источник"]),
      posted: getBool(f["Posted / Проведено"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tbl0A506K9OVCorYv",
    airtableTable: "19 Ledger Lines / Проводки",
    prismaModel: "ledgerLine",
    mapFields: (id, f) => ({
      id,
      line: getStr(f["Line / Проводка"]) || "Unnamed Line",
      debit: getNum(f["Debit (KGS) / Дебет (сом)"]),
      credit: getNum(f["Credit (KGS) / Кредит (сом)"]),
      memo: getStr(f["Memo / Назначение"]),
      journalEntryIds: getArr(f["Journal Entry"]),
      accountIds: getArr(f["Account"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblAu08dz4NZJ5HDs",
    airtableTable: "20 Vendors / Поставщики",
    prismaModel: "vendor",
    mapFields: (id, f) => ({
      id,
      vendorName: getStr(f["Vendor Name / Поставщик"]) || "Unnamed Vendor",
      category: getStr(f["Category / Категория"]),
      phone: getStr(f["Phone / Телефон"]),
      email: getStr(f["Email / Эл. почта"]),
      notes: getStr(f["Notes / Заметки"]),
      branchIds: getArr(f["Branch"]),
      nameRussian: getStr(f["Name (Russian) / Название"]),
    }),
  },
  {
    airtableTableId: "tblZPcDPnzTxp0sol",
    airtableTable: "21 Expenses / Расходы",
    prismaModel: "expense",
    mapFields: (id, f) => ({
      id,
      expenseNo: getStr(f["Expense No / Номер расхода"]) || "Unnamed Expense",
      date: getDate(f["Date / Дата"]),
      description: getStr(f["Description / Описание"]),
      amount: getNum(f["Amount (KGS) / Сумма (сом)"]),
      paymentMethod: getStr(f["Payment Method / Способ оплаты"]),
      paid: getBool(f["Paid / Оплачено"]),
      notes: getStr(f["Notes / Заметки"]),
      vendorIds: getArr(f["Vendor"]),
      expenseAccountIds: getArr(f["Expense Account"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tbl2YiFYDq00gJIrF",
    airtableTable: "22 Franchise Royalties / Роялти франшизы",
    prismaModel: "franchiseRoyalty",
    mapFields: (id, f) => ({
      id,
      royaltyNo: getStr(f["Royalty No / Номер роялти"]) || "Unnamed Royalty",
      period: getDate(f["Period / Период"]),
      revenueBase: getNum(f["Revenue Base (KGS) / База выручки (сом)"]),
      royaltyPercent: getNum(f["Royalty % / Роялти %"]),
      marketingFeePercent: getNum(f["Marketing Fee % / Маркетинговый сбор %"]),
      status: getStr(f["Status / Статус"]),
      studentsReported: getNum(f["Students Reported / Учеников в отчёте"]),
      activeCoursesReported: getNum(
        f["Active Courses Reported / Активных курсов в отчёте"],
      ),
      notes: getStr(f["Notes / Заметки"]),
      branchIds: getArr(f["Branch"]),
      vendorHQIds: getArr(f["Vendor (HQ)"]),
    }),
  },
  {
    airtableTableId: "tblGVA0enM9oxS9C0",
    airtableTable: "23 Teacher Pay / Оплата преподавателям",
    prismaModel: "teacherPay",
    mapFields: (id, f) => ({
      id,
      payRunNo: getStr(f["Pay Run No / Номер выплаты"]) || "Unnamed Pay",
      period: getDate(f["Period / Период"]),
      payType: getStr(f["Pay Type / Тип оплаты"]),
      hours: getNum(f["Hours / Часы"]),
      rate: getNum(f["Rate (KGS) / Ставка (сом)"]),
      grossPay: getNum(f["Gross Pay (KGS) / Начислено (сом)"]),
      paymentMethod: getStr(f["Payment Method / Способ оплаты"]),
      status: getStr(f["Status / Статус"]),
      datePaid: getDate(f["Date Paid / Дата выплаты"]),
      notes: getStr(f["Notes / Заметки"]),
      teacherIds: getArr(f["Teacher"]),
      branchIds: getArr(f["Branch"]),
    }),
  },
  {
    airtableTableId: "tblcOJdLkCBXXJ3AL",
    airtableTable: "24 Teacher Hours / Часы преподавателей",
    prismaModel: "teacherHours",
    mapFields: (id, f) => ({
      id,
      entry: getStr(f["Entry / Запись"]) || "Unnamed Entry",
      date: getDate(f["Date / Дата"]),
      hours: getNum(f["Hours / Часы"]),
      type: getStr(f["Type / Тип"]),
      notes: getStr(f["Notes / Заметки"]),
      teacherIds: getArr(f["Teacher"]),
      sessionIds: getArr(f["Session"]),
      branchIds: getArr(f["Branch"]),
      payRunIds: getArr(f["Pay Run"]),
    }),
  },
  {
    airtableTableId: "tblbGzoGxZVLRPB7k",
    airtableTable: "25 Activities / Действия",
    prismaModel: "activity",
    mapFields: (id, f) => ({
      id,
      activityId: getStr(f["Activity ID"]) || "Unnamed Activity",
      dateTime: getDate(f["Date/Time"]),
      type: getStr(f["Type"]),
      direction: getStr(f["Direction"]),
      outcome: getStr(f["Outcome"]),
      notes: getStr(f["Notes"]),
      nextFollowUpDate: getDate(f["Next Follow-up Date"]),
      leadIds: getArr(f["Lead"]),
      ownerIds: getArr(f["Owner"]),
    }),
  },
  {
    airtableTableId: "tblJQ9zndF47zIBVg",
    airtableTable: "26 Channel Performance / Эффективность каналов",
    prismaModel: "channelPerformance",
    mapFields: (id, f) => ({
      id,
      rowKey: getStr(f["Row Key"]) || "Unnamed Row",
      channel: getStr(f["Channel"]),
      month: getStr(f["Month"]),
      branchIds: getArr(f["Branch"]),
      leads: getNum(f["Leads"]),
      trialsBooked: getNum(f["Trials Booked"]),
      trialsAttended: getNum(f["Trials Attended"]),
      enrolled: getNum(f["Enrolled"]),
      lost: getNum(f["Lost"]),
      lostPrice: getNum(f["Lost – Price"]),
      lostSchedule: getNum(f["Lost – Schedule"]),
      lostLocation: getNum(f["Lost – Location"]),
      lostWentElsewhere: getNum(f["Lost – Went Elsewhere"]),
      lostNoResponse: getNum(f["Lost – No Response"]),
      lostOther: getNum(f["Lost – Other"]),
    }),
  },
  {
    airtableTableId: "tblMsyDxS6ltliuU1",
    airtableTable: "27 Notifications Log / Журнал уведомлений",
    prismaModel: "notificationLog",
    mapFields: (id, f) => ({
      id,
      notificationId:
        getStr(f["Notification ID / ID уведомления"]) || "Unnamed Notification",
      type: getStr(f["Type / Тип"]),
      channel: getStr(f["Channel / Канал"]),
      status: getStr(f["Status / Статус"]),
      scheduledFor: getDate(f["Scheduled For / Запланировано на"]),
      sentAt: getDate(f["Sent At / Отправлено"]),
      message: getStr(f["Message / Сообщение"]),
      leadIds: getArr(f["Lead / Лид"]),
      parentIds: getArr(f["Parent / Родитель"]),
      trialIds: getArr(f["Trial / Пробный урок"]),
      invoiceIds: getArr(f["Invoice / Счёт"]),
      enrollmentIds: getArr(f["Enrollment / Зачисление"]),
      branchIds: getArr(f["Branch / Филиал"]),
    }),
  },
];

// Main function to sync a single table by config
export async function syncTable(
  config: (typeof SYNC_CONFIGS)[0],
): Promise<{ count: number; error?: string }> {
  try {
    console.log(
      `[Sync] Fetching records from Airtable table: "${config.airtableTable}"...`,
    );
    const records = await airtableBase(config.airtableTable)
      .select({ maxRecords: 500 }) // Adjust limits or run recursive iteration to fetch all
      .all();

    console.log(
      `[Sync] Fetched ${records.length} records. Updating Postgres model: "${config.prismaModel}"...`,
    );

    const modelClient = (prisma as any)[config.prismaModel];
    if (!modelClient) {
      throw new Error(
        `Prisma model "${config.prismaModel}" not found on client`,
      );
    }

    let count = 0;
    for (const record of records) {
      const data = config.mapFields(record.id, record.fields);
      await modelClient.upsert({
        where: { id: record.id },
        update: data,
        create: data,
      });
      count++;
    }

    return { count };
  } catch (error: any) {
    console.error(`[Sync] Error syncing "${config.airtableTable}":`, error);
    return { count: 0, error: error.message || String(error) };
  }
}

// Function to sync all tables in sequence
export async function syncAllTables(): Promise<
  Record<string, { count: number; error?: string }>
> {
  const results: Record<string, { count: number; error?: string }> = {};
  for (const config of SYNC_CONFIGS) {
    const res = await syncTable(config);
    results[config.prismaModel] = res;
  }
  return results;
}

// New helper: Fetch payloads from Airtable Webhooks API and sync only the tables that changed
export async function syncChangedTables(
  webhookId: string,
): Promise<{ syncedTables: string[] }> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;

  if (!baseId || !pat) {
    throw new Error("Missing credentials for webhook payload fetch");
  }

  // Get payloads to find out which tables changed
  const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/payloads`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webhook payloads: ${response.statusText}`);
  }

  const data = await response.json();
  const changedTableIds = new Set<string>();

  // Extract all changed table IDs from payload list
  data.payloads?.forEach((payload: any) => {
    if (payload.changedTablesById) {
      Object.keys(payload.changedTablesById).forEach((tableId) => {
        changedTableIds.add(tableId);
      });
    }
  });

  const syncedTables: string[] = [];

  for (const tableId of changedTableIds) {
    const config = SYNC_CONFIGS.find((c) => c.airtableTableId === tableId);
    if (config) {
      console.log(
        `[Webhook Sync] Detected change in table: "${config.airtableTable}" (${tableId}). Syncing...`,
      );
      await syncTable(config);
      syncedTables.push(config.prismaModel);
    } else {
      console.log(
        `[Webhook Sync] Detected change in unknown table ID: ${tableId}`,
      );
    }
  }

  return { syncedTables };
}

// Auto-refresh the webhook to extend its expiration date for another 7 days
export async function refreshWebhook(webhookId: string): Promise<boolean> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;

  if (!baseId || !pat) {
    console.error("[Webhook Refresh] Missing credentials");
    return false;
  }

  const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      console.log(
        `[Webhook Refresh] Webhook ${webhookId} successfully extended for another 7 days!`,
      );
      return true;
    } else {
      const errorText = await res.text();
      console.error(
        `[Webhook Refresh] Failed to refresh webhook ${webhookId}:`,
        errorText,
      );
      return false;
    }
  } catch (error) {
    console.error(`[Webhook Refresh] Error calling refresh API:`, error);
    return false;
  }
}

// Check if a valid webhook exists for the target URL. If not, create it.
export async function ensureWebhookRegistered(notificationUrl: string): Promise<{ status: string; webhookId?: string; error?: string }> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;

  if (!baseId || !pat) {
    return { status: "missing_credentials" };
  }

  try {
    const listRes = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });

    if (!listRes.ok) {
      throw new Error(`Failed to list webhooks: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const now = new Date();

    // Look for an active webhook pointing to this URL with > 24 hours remaining
    const activeWebhook = listData.webhooks?.find((wh: any) => {
      if (wh.notificationUrl !== notificationUrl) return false;
      const expiry = new Date(wh.expirationTime);
      const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursRemaining > 24; 
    });

    if (activeWebhook) {
      return { status: "active", webhookId: activeWebhook.id };
    }

    console.log(`[Webhook Auto-Heal] No active webhook found for ${notificationUrl}. Registering new...`);

    const regRes = await fetch(`https://api.airtable.com/v0/bases/${baseId}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationUrl,
        specification: {
          options: {
            filters: {
              dataTypes: ["tableData"],
            },
          },
        },
      }),
    });

    if (!regRes.ok) {
      throw new Error(`Failed to register webhook: ${regRes.statusText}`);
    }

    const regData = await regRes.json();
    console.log(`[Webhook Auto-Heal] Registered new webhook: ${regData.id}`);
    return { status: "registered", webhookId: regData.id };
  } catch (error: any) {
    console.error("[Webhook Auto-Heal] Error checking/registering webhook:", error);
    return { status: "error", error: error.message || String(error) };
  }
}
