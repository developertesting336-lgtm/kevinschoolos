import * as airtableProxy from "./airtableProxy";
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
      name: getStr(f["flddNGdHHvaLSrv7H"]) || "Unnamed Branch",
      city: getStr(f["fld6iikgvqKQdb2GS"]),
      address: getStr(f["fld6ccSBR16tGHDxK"]),
      phone: getStr(f["fldyNWAwhZ2ZJ9GEi"]),
      status: getStr(f["fldpWUoqTZGKcfZsY"]),
      notes: getStr(f["fldNFVnSoifEBuAoG"]),
      openedDate: getDate(f["fldT5JlLwUIMonS3W"]),
    }),
  },
  {
    airtableTableId: "tblUkEhqFJBFTvRN5",
    airtableTable: "02 Users / Сотрудники",
    prismaModel: "user",
    mapFields: (id, f) => ({
      id,
      fullName: getStr(f["fldEzRbCBDmjzZ9m1"]) || "Unnamed User",
      role: getStr(f["fldBQj0DH9vw7eGiu"]),
      email: getStr(f["fldsj0eFf9lvCwt15"]),
      phone: getStr(f["fldzowV5r6HHYqMVZ"]),
      workingLanguage: getStr(f["fldPDnXM1aCwXc7Bk"]),
      status: getStr(f["fldEHvzfg1t5j5LHb"]),
      branchIds: getArr(f["fldtcpukcdFqHp8wi"]),
    }),
  },
  {
    airtableTableId: "tblgvltY5JtmMZs1q",
    airtableTable: "03 Courses / Курсы",
    prismaModel: "course",
    mapFields: (id, f) => ({
      id,
      courseName: getStr(f["fldbYYFQOqbeTdebb"]) || "Unnamed Course",
      nameRussian: getStr(f["fldGLUjh1RmyLup72"]),
      nameKyrgyz: getStr(f["fldpKeNW3MuF8uIlF"]),
      stage: getStr(f["fldIlrzmDuVOLthx6"]),
      ageBand: getStr(f["fld5bNKycikf0OTpd"]),
      lessonsPerWeek: getNum(f["fldQ9qPJoS3te6Vyh"]),
      defaultCapacity: getNum(f["fldqLd0VIJmKiIpu9"]),
      active: getBool(f["fldUnBT5gd5bS8ckM"]),
      description: getStr(f["fldsc3wRXOvoSyzA5"]),
    }),
  },
  {
    airtableTableId: "tbldiIHLyH7bup2XG",
    airtableTable: "04 Tuition Plans / Тарифные планы",
    prismaModel: "tuitionPlan",
    mapFields: (id, f) => ({
      id,
      planName: getStr(f["fldXQbeiCiTAeC8Q5"]) || "Unnamed Plan",
      amount: getNum(f["fldOm9NbQvNikr7e5"]),
      billingPeriod: getStr(f["fldzJoaYdz7VwF6r2"]),
      active: getBool(f["fldXIJDEPCkEqA2UZ"]),
      courseIds: getArr(f["fldUmXiXvDOqVevAy"]),
      nameRussian: getStr(f["fldzWFoNsJ4Fva7IR"]),
      nameKyrgyz: getStr(f["fldJah9AdenE3lzDY"]),
    }),
  },
  {
    airtableTableId: "tblVSaneGtUOq5Xzr",
    airtableTable: "05 Terms / Учебные периоды",
    prismaModel: "term",
    mapFields: (id, f) => ({
      id,
      termName: getStr(f["fldBq6BpHIbUk4Z6S"]) || "Unnamed Term",
      startDate: getDate(f["fldrWS56mbctboVeo"]),
      endDate: getDate(f["fldobz60hxw6UDwTd"]),
      status: getStr(f["fldmWWpSTWJGFIaQJ"]),
      nameRussian: getStr(f["fldqllNPMAPHDshLy"]),
    }),
  },
  {
    airtableTableId: "tblunCF2EX30onveH",
    airtableTable: "06 Rooms / Кабинеты",
    prismaModel: "room",
    mapFields: (id, f) => ({
      id,
      roomName: getStr(f["fldZ72by3okuB2raf"]) || "Unnamed Room",
      capacity: getNum(f["fldSspiuBDXAeHxgS"]),
      branchIds: getArr(f["fldnUe4DwO8wd7HKQ"]),
      nameRussian: getStr(f["fldRoVbOvTWdb5Pxs"]),
    }),
  },
  {
    airtableTableId: "tblItZ3B7d4YRO9ih",
    airtableTable: "07 Leads / Лиды",
    prismaModel: "lead",
    mapFields: (id, f) => ({
      id,
      leadName: getStr(f["fldeas819jz863u7f"]) || "Unnamed Lead",
      inquiryDate: getDate(f["fldFHzM6cRc4osvzB"]),
      channel: getStr(f["fldWQCM1qCCL0r7eK"]),
      childAge: getNum(f["fldRfaY8uVmBMdnMZ"]),
      preferredLanguage: getStr(f["fldQ2mKZIpH5J7E7D"]),
      status: getStr(f["fldN2dt6yL3FzUNIu"]),
      lostReason: getStr(f["fld0JO43zpFkf6N4M"]),
      phone: getStr(f["fldCmaAEjCR6Q2wvH"]),
      whatsapp: getStr(f["fldW3ZCVk3Sn0g2xA"]),
      notes: getStr(f["fldVNaPVuDC4E8M8I"]),
      parentIds: getArr(f["fldt5ssP2Ax0Fo4Zj"]),
      branchIds: getArr(f["fldtqwoAM6vOeQhVr"]),
      ownerIds: getArr(f["fldUfDRXRPnW3mIoD"]),
      lastActivityDate: getDate(f["fldgkqtYg9wHE0iw4"]),
    }),
  },
  {
    airtableTableId: "tblfvl5TjmWtr24Yp",
    airtableTable: "08 Trials / Пробные уроки",
    prismaModel: "trial",
    mapFields: (id, f) => ({
      id,
      trialId: getStr(f["fldiq4WuWIkCtVj1J"]) || "Unnamed Trial",
      dateTime: getDate(f["fldzCGpZO8q3iNw3K"]),
      outcome: getStr(f["fldGIxMvvMpf96UoR"]),
      notes: getStr(f["fld7yy1pPPTqXkphS"]),
      leadIds: getArr(f["fldDsWJSbmU9lHWTc"]),
      classGroupIds: getArr(f["fldpBUB8zEEqWmRzG"]),
      studentIds: getArr(f["fldo1WQXaLhCpRss0"]),
      confirmationSent: getBool(
        f["fldwVnsZrJkmpJ9cQ"],
      ),
      confirmationMethod: getStr(
        f["fldgDLfpjpPKeTZzw"],
      ),
      confirmationDate: getDate(f["fldh1ixyvOL4Le4nZ"]),
      levelAssessed: getStr(f["fldQ4C7b6C3P81TOY"]),
      teacherIds: getArr(f["fldvnLeHapzr4TSyB"]),
      enrollmentIds: getArr(f["fld7qKBZvQj5sRjgW"]),
    }),
  },
  {
    airtableTableId: "tblRJNw4S6o1WPjBI",
    airtableTable: "09 Parents / Родители",
    prismaModel: "parent",
    mapFields: (id, f) => ({
      id,
      parentName: getStr(f["fldlQ21VINxCwAnWS"]) || "Unnamed Parent",
      phone: getStr(f["fldhXjSQ1OK84qBA2"]),
      whatsapp: getStr(f["flddmO9P8vfEtOETO"]),
      email: getStr(f["fld5dinv8NWVXzDTv"]),
      preferredLanguage: getStr(f["fldBziCmPC26d5GmQ"]),
      address: getStr(f["fldlwZtlcDEPR9rx3"]),
      notes: getStr(f["fldRLXGPc9Ew8iR3a"]),
      studentIds: getArr(f["fldjxCkq3H83tl2Ai"]),
      branchIds: getArr(f["fldscHRaf8yjx8Y9C"]),
      whatsappGroupAdded: getBool(
        f["fld9vjtKdybgtN3Qw"],
      ),
      whatsappGroupName: getStr(f["fldEKqzIcFh3mj7ce"]),
    }),
  },
  {
    airtableTableId: "tbl9Ddw4uRQ3i6e1B",
    airtableTable: "10 Students / Ученики",
    prismaModel: "student",
    mapFields: (id, f) => ({
      id,
      studentName: getStr(f["fldqCvnVj9WoNh2iH"]) || "Unnamed Student",
      dateOfBirth: getDate(f["fldkfzzCiudEa0bQd"]),
      gender: getStr(f["fldU1OfNXoTt92Yu1"]),
      status: getStr(f["fldY0norcWBqukttE"]),
      notes: getStr(f["flds3q5fTrCiMHf7B"]),
      parentIds: getArr(f["fldwzFCeLGUPaZovG"]),
      branchIds: getArr(f["fldTeS3Yg44gCGB90"]),
      medicalNotes: getStr(f["fldfYXrdppjO16EcQ"]),
    }),
  },
  {
    airtableTableId: "tblpUJni7tMvO2QBs",
    airtableTable: "11 Class Groups / Группы",
    prismaModel: "classGroup",
    mapFields: (id, f) => ({
      id,
      groupName: getStr(f["fld0hugbTJfWykog6"]) || "Unnamed Group",
      weekdays: getArr(f["fldT6sSsiyMfzeVbl"]),
      startTime: getStr(f["fld1JBoWGWKKzZGm5"]),
      capacity: getNum(f["fldAn13Aw3EIk07kU"]),
      status: getStr(f["fldEzlnrYrwTk3UTC"]),
      courseIds: getArr(f["fldO5MP5ijTdm7lGv"]),
      teacherIds: getArr(f["fldPvtA1ugZitmSkT"]),
      roomIds: getArr(f["fldVRgnzmNG4SWcAS"]),
      termIds: getArr(f["fldzmR8v8uue3Ce0Q"]),
      branchIds: getArr(f["fldzQWsTvAK9VkcxC"]),
    }),
  },
  {
    airtableTableId: "tblVA5O7fnBx5cAnJ",
    airtableTable: "12 Enrollments / Зачисления",
    prismaModel: "enrollment",
    mapFields: (id, f) => ({
      id,
      enrollmentId:
        getStr(f["fld1RmaZD4oSBFSIe"]) || "Unnamed Enrollment",
      enrollDate: getDate(f["fld1Mc0uYqz7w4NqP"]),
      status: getStr(f["fld5ngZOAsR4qF7R7"]),
      studentIds: getArr(f["fldV9CDG6hTBsoPyP"]),
      classGroupIds: getArr(f["fld0tk6w9UAtCKrWA"]),
      tuitionPlanIds: getArr(f["fldIESu0tEeFvUiuA"]),
      branchIds: getArr(f["fldwtRAb9ZXRe3ekD"]),
      trialFeeDeducted: getBool(f["fldb4YxItQuVlFnN7"]),
      contractSigned: getBool(f["fldblwDp8eo6EwKGB"]),
      contractDate: getDate(f["fldi8KyGXRj5tuhoH"]),
      hdSystemRegistered: getBool(
        f["fldz8xpBExqXB546O"],
      ),
      appCredentialsIssued: getBool(f["fldtgJU9259Sf78x9"]),
      scheduleDelivered: getBool(f["fldF5fb9UFQNHmObG"]),
      calendarDelivered: getBool(f["fldhH2aL9TJzK7bVR"]),
      appInstructionsDelivered: getBool(
        f["fldaLd0966SrwZDJv"],
      ),
      audioRecommendationsDelivered: getBool(
        f["fldWj3sCWbxwJnzNq"],
      ),
      firstLessonConfirmed: getBool(
        f["fld0vvw0hpO2FZr3F"],
      ),
      firstLessonDate: getDate(f["fldMIiRIiEkU32lGv"]),
      onboardingStatus: getStr(f["fldV0VR7E7xehetvI"]),
    }),
  },
  {
    airtableTableId: "tblUE4gfr8en6lfUS",
    airtableTable: "13 Sessions / Занятия",
    prismaModel: "session",
    mapFields: (id, f) => ({
      id,
      sessionId: getStr(f["fldNsZ1ZqsBjoLrBL"]) || "Unnamed Session",
      dateTime: getDate(f["fldUvECWZHq4GtqW7"]),
      status: getStr(f["fldqDJoUvxYzgG8iX"]),
      classGroupIds: getArr(f["flduqKWGTffHWfUNj"]),
      teacherIds: getArr(f["fld4yXmapYbpqSiGG"]),
      branchIds: getArr(f["fldgrGJWXUCjxhXpT"]),
    }),
  },
  {
    airtableTableId: "tblbOAIuMZHgtsjEP",
    airtableTable: "14 Attendance / Посещаемость",
    prismaModel: "attendance",
    mapFields: (id, f) => ({
      id,
      attendanceId:
        getStr(f["fldOP511IijW9upZQ"]) || "Unnamed Attendance",
      status: getStr(f["fldcZrerDfUIXphLv"]),
      sessionIds: getArr(f["fld3eZM0egp7xsq7Y"]),
      studentIds: getArr(f["fldTdGs2iLe0cL5RW"]),
    }),
  },
  {
    airtableTableId: "tblTB6N6jNqSFvEER",
    airtableTable: "15 Invoices / Счета",
    prismaModel: "invoice",
    mapFields: (id, f) => ({
      id,
      invoiceNo: getStr(f["fldNNE3i257SnDb0c"]) || "Unnamed Invoice",
      issueDate: getDate(f["fldZ2vfOggiAbm0fC"]),
      dueDate: getDate(f["fldj95LOGimRgZ4Vj"]),
      amount: getNum(f["fldRiqHHe5aqGoyif"]),
      status: getStr(f["fldqJey7ciPEqd59k"]),
      parentIds: getArr(f["fldAzvJxxt46d7oi5"]),
      studentIds: getArr(f["fldgkxO5Yu98qW3wi"]),
      enrollmentIds: getArr(f["fldJqNHYliWVxveD4"]),
      branchIds: getArr(f["fld9gBMYbKHjrloEs"]),
    }),
  },
  {
    airtableTableId: "tbliFcGpMbqnMaD9S",
    airtableTable: "16 Payments / Платежи",
    prismaModel: "payment",
    mapFields: (id, f) => ({
      id,
      paymentRef:
        getStr(f["fldm73NgmVL0vFOuF"]) || "Unnamed Payment",
      date: getDate(f["fldBtNTeQVfZk1sWL"]),
      amount: getNum(f["fldNRFTgAgktyLZ4V"]),
      method: getStr(f["fldvC8KDDOXvuavro"]),
      invoiceIds: getArr(f["fld22tf9Mn0HGsmzN"]),
      parentIds: getArr(f["fldNVXBMA6RO2Xovb"]),
      branchIds: getArr(f["fldTkBn9cMAnnA0YF"]),
      possibleDuplicate: getBool(f["fldXYyFJX04FtXzE2"]),
      paymentType: getStr(f["fld1dSpRaL2A6EK6Q"]),
    }),
  },
  {
    airtableTableId: "tblLkuBm7zVJKpzzu",
    airtableTable: "17 Chart of Accounts / План счетов",
    prismaModel: "account",
    mapFields: (id, f) => ({
      id,
      accountNo: getStr(f["fldzahTGpZDOiZwcN"]) || "Unnamed Account",
      accountName:
        getStr(f["fldzaMxKxPt9rmkFi"]) || "Unnamed Account",
      nameRussian: getStr(f["fldFGNTJdcuv9pJc9"]),
      type: getStr(f["flduueVpbzU9Zi3Lz"]),
      subType: getStr(f["fldsI2kXM3Sz9L3gJ"]),
      normalSide: getStr(f["fld2mqd9QfmRkTgxs"]),
      active: getBool(f["fldg5vMJ4S2dt4qNM"]),
      notes: getStr(f["fldpTAyVttb9KTjI2"]),
      branchIds: getArr(f["fldPFo8Bpn2h7GjhH"]),
    }),
  },
  {
    airtableTableId: "tblRf3mdeZmzp2mnf",
    airtableTable: "18 Journal Entries / Журнальные записи",
    prismaModel: "journalEntry",
    mapFields: (id, f) => ({
      id,
      entryNo: getStr(f["fldu9Nus6mibMGB6y"]) || "Unnamed Entry",
      date: getDate(f["fldqPoazkusrbYqQf"]),
      memo: getStr(f["fldMHUDO2IdD35980"]),
      source: getStr(f["fldnV5JMpmeqxtXSF"]),
      posted: getBool(f["fldBGfyt6xbhx17IX"]),
      branchIds: getArr(f["fldgcbUNdIvRUGhad"]),
    }),
  },
  {
    airtableTableId: "tbl0A506K9OVCorYv",
    airtableTable: "19 Ledger Lines / Проводки",
    prismaModel: "ledgerLine",
    mapFields: (id, f) => ({
      id,
      line: getStr(f["fldfFrbrl6dWvF8sJ"]) || "Unnamed Line",
      debit: getNum(f["fldcnvYSMp1fgjQRe"]),
      credit: getNum(f["fld3IioZDzgMRWTMJ"]),
      memo: getStr(f["fldJlDJdWvxeLQQMv"]),
      journalEntryIds: getArr(f["fldY5mi0w7NNTTtWd"]),
      accountIds: getArr(f["fldUhVBX0AVaVj1X6"]),
      branchIds: getArr(f["fldAWBH3eOpp1XMyP"]),
    }),
  },
  {
    airtableTableId: "tblAu08dz4NZJ5HDs",
    airtableTable: "20 Vendors / Поставщики",
    prismaModel: "vendor",
    mapFields: (id, f) => ({
      id,
      vendorName: getStr(f["fldrUAaCEBNxGMyx5"]) || "Unnamed Vendor",
      category: getStr(f["fldv1qOQjihrhVW0x"]),
      phone: getStr(f["fldRfwq0NoTuKQQSl"]),
      email: getStr(f["fld2It0tGuGAVcDHo"]),
      notes: getStr(f["fld1ESQQ52ldthXxZ"]),
      branchIds: getArr(f["fldLw7vxkQtZkpSdx"]),
      nameRussian: getStr(f["fldbeK1OH5EWpmOdO"]),
    }),
  },
  {
    airtableTableId: "tblZPcDPnzTxp0sol",
    airtableTable: "21 Expenses / Расходы",
    prismaModel: "expense",
    mapFields: (id, f) => ({
      id,
      expenseNo: getStr(f["fldJc78XmxkOrUd4u"]) || "Unnamed Expense",
      date: getDate(f["fldVS53LAjlqd4cIa"]),
      description: getStr(f["fldm0uNTuKoeLHhny"]),
      amount: getNum(f["fldLv6BNV3WrJVjSZ"]),
      paymentMethod: getStr(f["fldGjqThQ37a4z9fl"]),
      paid: getBool(f["fldTdMu8Si7mJ7oB2"]),
      notes: getStr(f["fldXaco0O6sIvFb3V"]),
      vendorIds: getArr(f["fldmATbX0cz4GGO2c"]),
      expenseAccountIds: getArr(f["fld6ps8NBgIa48a4i"]),
      branchIds: getArr(f["fldcbXhKHHUF8uMEY"]),
    }),
  },
  {
    airtableTableId: "tbl2YiFYDq00gJIrF",
    airtableTable: "22 Franchise Royalties / Роялти франшизы",
    prismaModel: "franchiseRoyalty",
    mapFields: (id, f) => ({
      id,
      royaltyNo: getStr(f["fldNMTTOpiFuA2cBA"]) || "Unnamed Royalty",
      period: getDate(f["fldfpaWrgjNb790iw"]),
      revenueBase: getNum(f["fldmrPs9dSPepfXL0"]),
      royaltyPercent: getNum(f["fldLdvNZruotiqXNP"]),
      marketingFeePercent: getNum(f["fldn8kJzBXtJ1rYxl"]),
      status: getStr(f["flddGjnyp6XXTqhjC"]),
      studentsReported: getNum(f["fldGFKJtr8KtrD7OP"]),
      activeCoursesReported: getNum(
        f["fld5rg9qzLWUGzPAW"],
      ),
      notes: getStr(f["fldOkHNxjOAlWwJxZ"]),
      branchIds: getArr(f["fldnIfCGj9gKH6uBA"]),
      vendorHQIds: getArr(f["fld0h1a9Ft4YZ144b"]),
    }),
  },
  {
    airtableTableId: "tblGVA0enM9oxS9C0",
    airtableTable: "23 Teacher Pay / Оплата преподавателям",
    prismaModel: "teacherPay",
    mapFields: (id, f) => ({
      id,
      payRunNo: getStr(f["fldB5lN65eMtTeL4n"]) || "Unnamed Pay",
      period: getDate(f["fldwHAgLQsZtRZ9P8"]),
      payType: getStr(f["fldJOfszdvJczMqrp"]),
      hours: getNum(f["fldv7gRIK4beCmHwJ"]),
      rate: getNum(f["fldhLllLgDhMO2Bfk"]),
      grossPay: getNum(f["fldQMUw8FXYdNWmCP"]),
      paymentMethod: getStr(f["fldmudyERr4jqoZTw"]),
      status: getStr(f["fldBoXhWuU6cCKSZY"]),
      datePaid: getDate(f["fldVmd0aCzGeMDKG5"]),
      notes: getStr(f["fldMrOoD74xoLjfmt"]),
      teacherIds: getArr(f["fldTfIdi9QNbbK2pP"]),
      branchIds: getArr(f["fldYvb8tUOa7nRZEt"]),
    }),
  },
  {
    airtableTableId: "tblcOJdLkCBXXJ3AL",
    airtableTable: "24 Teacher Hours / Часы преподавателей",
    prismaModel: "teacherHours",
    mapFields: (id, f) => ({
      id,
      entry: getStr(f["fld6wbhMUYG1Bx64t"]) || "Unnamed Entry",
      date: getDate(f["fldYwU89ANpW9x4wN"]),
      hours: getNum(f["fld3b4u9q9yNK9OxX"]),
      type: getStr(f["fldM7A0izGJBMebrZ"]),
      notes: getStr(f["fldZAYRlIyx7fnWR6"]),
      teacherIds: getArr(f["fldtOlMiMgBc3klqy"]),
      sessionIds: getArr(f["fldEI4WLvWSx33PVM"]),
      branchIds: getArr(f["fldNXpP5UJ0NHeeIW"]),
      payRunIds: getArr(f["fldZ9Ky01Gl9pYCF2"]),
    }),
  },
  {
    airtableTableId: "tblbGzoGxZVLRPB7k",
    airtableTable: "25 Activities / Действия",
    prismaModel: "activity",
    mapFields: (id, f) => ({
      id,
      activityId: getStr(f["fldoau73AEa6wab3u"]) || "Unnamed Activity",
      dateTime: getDate(f["fldu5wzalKwiwzvxm"]),
      type: getStr(f["fldK1Qiak0WKVApyF"]),
      direction: getStr(f["fldMGTRhCVX51eii5"]),
      outcome: getStr(f["fldWvDv570YdNJDbv"]),
      notes: getStr(f["fldgsOoOJLKM1XWv5"]),
      nextFollowUpDate: getDate(f["fldZ8Z9ZlzA6Slv8g"]),
      leadIds: getArr(f["fldTzMvnpw3jRPVLi"]),
      ownerIds: getArr(f["flddCRQoHzWfkL4uy"]),
    }),
  },
  {
    airtableTableId: "tblJQ9zndF47zIBVg",
    airtableTable: "26 Channel Performance / Эффективность каналов",
    prismaModel: "channelPerformance",
    mapFields: (id, f) => ({
      id,
      rowKey: getStr(f["fldZEPYtlVq5t9BeW"]) || "Unnamed Row",
      channel: getStr(f["flddurNEqmVuru2hd"]),
      month: getStr(f["fldcO2Rie57r50CNy"]),
      branchIds: getArr(f["fldHN2DvHWXngGYoB"]),
      leads: getNum(f["fldjqZaLUYoRYrJYJ"]),
      trialsBooked: getNum(f["fldyJdpI4v8VXEnCA"]),
      trialsAttended: getNum(f["fldmTD6HBTanGx8p7"]),
      enrolled: getNum(f["fldpJcyZHMSmZhQim"]),
      lost: getNum(f["fldt02Ck80E4pYP0f"]),
      lostPrice: getNum(f["fldJWXPXzHbAUvbYE"]),
      lostSchedule: getNum(f["fldBxaNJhtIwB8icu"]),
      lostLocation: getNum(f["fldc4oY5iPSb7wyAZ"]),
      lostWentElsewhere: getNum(f["fld1X31Tnt093tEDF"]),
      lostNoResponse: getNum(f["fldguSNJhSfzFbKa9"]),
      lostOther: getNum(f["fldXhJQ8uRRj4FrNW"]),
    }),
  },
  {
    airtableTableId: "tblMsyDxS6ltliuU1",
    airtableTable: "27 Notifications Log / Журнал уведомлений",
    prismaModel: "notificationLog",
    mapFields: (id, f) => ({
      id,
      notificationId:
        getStr(f["fldTOgOuPO0cxotRD"]) || "Unnamed Notification",
      type: getStr(f["fldD7GPwIWaQJsmQD"]),
      channel: getStr(f["fldRH9XSz8wgIBubm"]),
      status: getStr(f["fldwqVbQLvU1L9lcu"]),
      scheduledFor: getDate(f["fldzUL5yntIyaY9KY"]),
      sentAt: getDate(f["fldjbuRE0T1t8Ilft"]),
      message: getStr(f["fldqoZQnZofGgamDN"]),
      leadIds: getArr(f["fldLamSrxr6yAoQpF"]),
      parentIds: getArr(f["fldRBIuP7b7JKf72J"]),
      trialIds: getArr(f["fld8QNzZkvw8FKemr"]),
      invoiceIds: getArr(f["fldkUrOowRBmMGX01"]),
      enrollmentIds: getArr(f["fldVqWHc8M9FDXbmt"]),
      branchIds: getArr(f["fldDLq6PSWWxvVXDu"]),
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
    const records = await airtableProxy.readTable(config.airtableTableId);

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
