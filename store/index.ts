import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import dashboardSlice from "./slices/dashboardSlice";
import admissionsSlice from "./slices/admissionsSlice";
import onboardingSlice from "./slices/onboardingSlice";
import paymentsSlice from "./slices/paymentsSlice";
import branchesSlice from "./slices/branchesSlice";
import usersSlice from "./slices/usersSlice";
import studentsSlice from "./slices/studentsSlice";
import parentsSlice from "./slices/parentsSlice";
import trialsSlice from "./slices/trialsSlice";
import activitiesSlice from "./slices/activitiesSlice";
import roomsSlice from "./slices/roomsSlice";
import classGroupsSlice from "./slices/classGroupsSlice";
import coursesSlice from "./slices/coursesSlice";
import invoicesSlice from "./slices/invoicesSlice";
import enrollmentsSlice from "./slices/enrollmentsSlice";
import billingSlice from "./slices/billingSlice";
import channelPerformanceSlice from "./slices/channelPerformanceSlice";
import financeSlice from "./slices/financeSlice";
import notificationsSlice from "./slices/notificationsSlice";
import ownerTableSlice from "./slices/ownerTableSlice";
import scheduleSlice from "./slices/scheduleSlice";
import staffSlice from "./slices/staffSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    dashboard: dashboardSlice,
    admissions: admissionsSlice,
    onboarding: onboardingSlice,
    payments: paymentsSlice,
    branches: branchesSlice,
    users: usersSlice,
    students: studentsSlice,
    parents: parentsSlice,
    trials: trialsSlice,
    activities: activitiesSlice,
    rooms: roomsSlice,
    classGroups: classGroupsSlice,
    courses: coursesSlice,
    invoices: invoicesSlice,
    enrollments: enrollmentsSlice,
    billing: billingSlice,
    channelPerformance: channelPerformanceSlice,
    finance: financeSlice,
    notifications: notificationsSlice,
    ownerTable: ownerTableSlice,
    schedule: scheduleSlice,
    staff: staffSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ["auth/setSession"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
