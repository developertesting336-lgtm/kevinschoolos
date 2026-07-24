import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface LeadData {
  id: string;
  leadName: string;
  phone: string | null;
  whatsapp: string | null;
  channel: string | null;
  status: string | null;
  parentIds: string[];
  branchIds: string[];
  ownerIds: string[];
  notes: string | null;
  preferredLanguage: string | null;
  childAge: number | null;
  inquiryDate: string | Date | null;
  lostReason: string | null;
  lastActivityDate: string | Date | null;
}

export interface ParentData {
  id: string;
  parentName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UserData {
  id: string;
  fullName: string;
  role?: string | null;
}

export interface BranchData {
  id: string;
  name: string;
}

export interface TrialData {
  id: string;
  trialId: string;
  dateTime: string | Date | null;
  outcome: string | null;
  notes: string | null;
  leadIds: string[];
  teacherIds: string[];
  classGroupIds: string[];
}

export interface ActivityData {
  id: string;
  activityId: string;
  dateTime: string | Date | null;
  type: string | null;
  direction: string | null;
  outcome: string | null;
  notes: string | null;
  nextFollowUpDate: string | Date | null;
  leadIds: string[];
  ownerIds: string[];
}

export interface RoomData {
  id: string;
  roomName: string;
}

export interface ClassGroupData {
  id: string;
  groupName: string;
  roomIds: string[];
  courseIds: string[];
  branchIds: string[];
}

interface AdmissionsState {
  leads: LeadData[];
  parents: ParentData[];
  users: UserData[];
  branches: BranchData[];
  trials: TrialData[];
  activities: ActivityData[];
  rooms: RoomData[];
  classGroups: ClassGroupData[];
  sources: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
  savingLead: boolean;
  savingActivity: boolean;
  savingTrial: boolean;
  saveLeadError: string | null;
  saveActivityError: string | null;
  saveTrialError: string | null;
  filters: {
    search?: string;
    branch?: string;
    status?: string;
    owner?: string;
    source?: string;
    trialDate?: string;
  };
}

const initialState: AdmissionsState = {
  leads: [],
  parents: [],
  users: [],
  branches: [],
  trials: [],
  activities: [],
  rooms: [],
  classGroups: [],
  sources: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  },
  loading: true,
  error: null,
  savingLead: false,
  savingActivity: false,
  savingTrial: false,
  saveLeadError: null,
  saveActivityError: null,
  saveTrialError: null,
  filters: {},
};

export const fetchAdmissionsData = createAsyncThunk(
  "admissions/fetchAdmissionsData",
  async (filters: { page?: number; search?: string; branch?: string; status?: string; owner?: string; source?: string; trialDate?: string; forceRefetch?: boolean }, { getState, rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(filters.page || 1));
      params.set("limit", "30");
      if (filters.search) params.set("search", filters.search);
      if (filters.branch) params.set("branch", filters.branch);
      if (filters.status) params.set("status", filters.status);
      if (filters.owner) params.set("owner", filters.owner);
      if (filters.source) params.set("source", filters.source);
      if (filters.trialDate) params.set("trialDate", filters.trialDate);

      const state = getState() as any;
      const admissionsState = state.admissions;
      const force = filters.forceRefetch === true;
      const alreadyHasMetadata = !force && admissionsState && admissionsState.parents.length > 0;

      let leadsResponse;
      let branchesRes = alreadyHasMetadata ? admissionsState.branches : [];
      let usersRes = alreadyHasMetadata ? admissionsState.users : [];
      let parentsRes = alreadyHasMetadata ? admissionsState.parents : [];
      let trialsRes = alreadyHasMetadata ? admissionsState.trials : [];
      let activitiesRes = alreadyHasMetadata ? admissionsState.activities : [];
      let roomsRes = alreadyHasMetadata ? admissionsState.rooms : [];
      let classGroupsRes = alreadyHasMetadata ? admissionsState.classGroups : [];

      if (alreadyHasMetadata) {
        leadsResponse = await fetch(`/api/data/lead?${params.toString()}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } }));
      } else {
        const responses = await Promise.all([
          fetch(`/api/data/lead?${params.toString()}`).then((r) => r.json()).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 30, totalPages: 1 } })),
          fetch("/api/data/branch").then((r) => r.json()).catch(() => []),
          fetch("/api/data/user").then((r) => r.json()).catch(() => []),
          fetch("/api/data/parent").then((r) => r.json()).catch(() => []),
          fetch("/api/data/trial").then((r) => r.json()).catch(() => []),
          fetch("/api/data/activity").then((r) => r.json()).catch(() => []),
          fetch("/api/data/room").then((r) => r.json()).catch(() => []),
          fetch("/api/data/classgroup").then((r) => r.json()).catch(() => []),
        ]);
        leadsResponse = responses[0];
        branchesRes = responses[1];
        usersRes = responses[2];
        parentsRes = responses[3];
        trialsRes = responses[4];
        activitiesRes = responses[5];
        roomsRes = responses[6];
        classGroupsRes = responses[7];
      }

      const leads = (leadsResponse as any).data || [];
      const pagination = (leadsResponse as any).pagination || initialState.pagination;
      const sources = Array.from(new Set(leads.map((l: any) => l.channel).filter(Boolean))) as string[];

      return {
        leads,
        parents: Array.isArray(parentsRes) ? parentsRes : [],
        users: Array.isArray(usersRes) ? usersRes : [],
        branches: Array.isArray(branchesRes) ? branchesRes : [],
        trials: Array.isArray(trialsRes) ? trialsRes : [],
        activities: Array.isArray(activitiesRes) ? activitiesRes : [],
        rooms: Array.isArray(roomsRes) ? roomsRes : [],
        classGroups: Array.isArray(classGroupsRes) ? classGroupsRes : [],
        sources: sources.length > 0 ? sources : ["Instagram", "Facebook", "Web", "WhatsApp", "Recommendation", "Other"],
        pagination,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch admissions data");
    }
  }
);

export const createLeadThunk = createAsyncThunk(
  "admissions/createLead",
  async (
    leadData: {
      parentName: string;
      childName: string;
      phone: string;
      whatsapp: string;
      email: string;
      childAge: number | null;
      branchId: string;
      interestedCourse: string;
      marketingChannel: string;
      assignedStaffId: string;
      leadStatus: string;
      notes: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/admissions/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Lead.");
      }
      // Refresh admissions data
      dispatch(fetchAdmissionsData({ forceRefetch: true }));
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create Lead");
    }
  }
);

export const createActivityThunk = createAsyncThunk(
  "admissions/createActivity",
  async (
    activityData: {
      activityType: string;
      notes: string;
      nextFollowUpDate: string | null;
      leadId: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/admissions/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create Activity.");
      }
      // Refresh admissions data
      dispatch(fetchAdmissionsData({ forceRefetch: true }));
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create Activity");
    }
  }
);


export const createTrialThunk = createAsyncThunk(
  "admissions/createTrial",
  async (
    trialData: {
      leadId: string;
      classGroupId: string;
      teacherId: string;
      trialDate: string;
      trialTime: string;
      confirmationMethod?: string;
      notes?: string;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/admissions/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trialData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to schedule Trial.");
      }
      // Refresh admissions data
      dispatch(fetchAdmissionsData({ forceRefetch: true }));
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to schedule Trial");
    }
  }
);

export const convertLeadThunk = createAsyncThunk(
  "admissions/convertLead",
  async (
    payload: {
      leadId: string;
      parentInfo: { name: string; phone?: string; whatsapp?: string; email?: string };
      studentInfo: { name: string; dob?: string; gender?: string };
      classGroupId: string;
      tuitionPlanId: string;
      enrollDate?: string;
      enrollmentStatus?: string;
      completeTrial: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch("/api/admissions/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Failed to convert lead.");
      }
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to convert lead.");
    }
  }
);

const admissionsSlice = createSlice({
  name: "admissions",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<AdmissionsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearAdmissions: (state) => {
      state.leads = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdmissionsData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdmissionsData.fulfilled, (state, action) => {
        state.leads = action.payload.leads;
        state.parents = action.payload.parents;
        state.users = action.payload.users;
        state.branches = action.payload.branches;
        state.trials = action.payload.trials;
        state.activities = action.payload.activities;
        state.rooms = action.payload.rooms;
        state.classGroups = action.payload.classGroups;
        state.sources = action.payload.sources;
        state.pagination = action.payload.pagination;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchAdmissionsData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Lead Thunk cases
      .addCase(createLeadThunk.pending, (state) => {
        state.savingLead = true;
        state.saveLeadError = null;
      })
      .addCase(createLeadThunk.fulfilled, (state) => {
        state.savingLead = false;
        state.saveLeadError = null;
      })
      .addCase(createLeadThunk.rejected, (state, action) => {
        state.savingLead = false;
        state.saveLeadError = action.payload as string;
      })
      // Create Activity Thunk cases
      .addCase(createActivityThunk.pending, (state) => {
        state.savingActivity = true;
        state.saveActivityError = null;
      })
      .addCase(createActivityThunk.fulfilled, (state) => {
        state.savingActivity = false;
        state.saveActivityError = null;
      })
      .addCase(createActivityThunk.rejected, (state, action) => {
        state.savingActivity = false;
        state.saveActivityError = action.payload as string;
      })
      // Create Trial Thunk cases
      .addCase(createTrialThunk.pending, (state) => {
        state.savingTrial = true;
        state.saveTrialError = null;
      })
      .addCase(createTrialThunk.fulfilled, (state) => {
        state.savingTrial = false;
        state.saveTrialError = null;
      })
      .addCase(createTrialThunk.rejected, (state, action) => {
        state.savingTrial = false;
        state.saveTrialError = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearAdmissions } = admissionsSlice.actions;
export default admissionsSlice.reducer;

// Selectors
export const selectAdmissionsLeads = (state: any) => state.admissions.leads;
export const selectAdmissionsParents = (state: any) => state.admissions.parents;
export const selectAdmissionsUsers = (state: any) => state.admissions.users;
export const selectAdmissionsBranches = (state: any) => state.admissions.branches;
export const selectAdmissionsTrials = (state: any) => state.admissions.trials;
export const selectAdmissionsActivities = (state: any) => state.admissions.activities;
export const selectAdmissionsRooms = (state: any) => state.admissions.rooms;
export const selectAdmissionsClassGroups = (state: any) => state.admissions.classGroups;
export const selectAdmissionsSources = (state: any) => state.admissions.sources;
export const selectAdmissionsPagination = (state: any) => state.admissions.pagination;
export const selectAdmissionsLoading = (state: any) => state.admissions.loading;
export const selectAdmissionsError = (state: any) => state.admissions.error;
export const selectAdmissionsFilters = (state: any) => state.admissions.filters;
export const selectAdmissionsSavingLead = (state: any) => state.admissions.savingLead;
export const selectAdmissionsSavingActivity = (state: any) => state.admissions.savingActivity;
export const selectAdmissionsSavingTrial = (state: any) => state.admissions.savingTrial;
export const selectAdmissionsSaveLeadError = (state: any) => state.admissions.saveLeadError;
export const selectAdmissionsSaveActivityError = (state: any) => state.admissions.saveActivityError;
export const selectAdmissionsSaveTrialError = (state: any) => state.admissions.saveTrialError;

