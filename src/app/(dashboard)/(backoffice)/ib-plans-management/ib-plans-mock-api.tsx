// TEMPORARY MOCK — remove this file and revert page.tsx's imports
// once the real /admin/ib-plans and /admin/account-types endpoints exist.
//
// Mimics the exact call signatures of adminIbPlansApi / adminAccountTypesApi
// from "@/lib/api" so page.tsx only needs its two import lines swapped.

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nowIso = () => new Date().toISOString();

const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

type MockCommission = {
  level: string;
  rate_ib: number;
  rate_sub_ib_1: number;
  rate_sub_ib_2: number;
  rate_sub_ib_3: number;
  rate_sub_ib_4: number;
  rate_sub_ib_5: number;
};

const LEVELS = ["IB", "Level-1", "Level-2", "Level-3", "Level-4", "Level-5"] as const;

const makeCommissions = (base: number): MockCommission[] =>
  LEVELS.map((level, i) => ({
    level,
    rate_ib: i === 0 ? base : 0,
    rate_sub_ib_1: i <= 1 ? Math.max(base - i * 2, 0) : 0,
    rate_sub_ib_2: i <= 2 ? Math.max(base - i * 2, 0) : 0,
    rate_sub_ib_3: i <= 3 ? Math.max(base - i * 2, 0) : 0,
    rate_sub_ib_4: i <= 4 ? Math.max(base - i * 2, 0) : 0,
    rate_sub_ib_5: Math.max(base - i * 2, 0),
  }));

// ---- Account types (mock) ----
export const MOCK_ACCOUNT_TYPES = [
  { id: "1", name: "Standard" },
  { id: "2", name: "ECN" },
  { id: "3", name: "VIP" },
  { id: "4", name: "Raw Spread" },
  { id: "5", name: "Islamic" },
];

const accountTypeCommissionSeed: Record<string, number> = {
  "1": 8,
  "2": 6,
  "3": 12,
  "4": 7,
  "5": 5,
};

// ---- IB Plans (mock) ----
let mockPlans = [
  {
    id: "101",
    name: "Gold Partner Plan",
    description: "Flagship plan for high-volume introducing partners with tiered payouts.",
    status: true,
    ib_user_count: 42,
    created_at: daysAgoIso(120),
    updated_at: daysAgoIso(2),
    account_types: [
      {
        account_type_id: "1",
        account_type_name: "Standard",
        commissions: makeCommissions(8),
      },
      {
        account_type_id: "3",
        account_type_name: "VIP",
        commissions: makeCommissions(12),
      },
    ],
  },
  {
    id: "102",
    name: "Silver Partner Plan",
    description: "Entry-level partner plan, single account type.",
    status: true,
    ib_user_count: 17,
    created_at: daysAgoIso(80),
    updated_at: daysAgoIso(9),
    account_types: [
      {
        account_type_id: "2",
        account_type_name: "ECN",
        commissions: makeCommissions(6),
      },
    ],
  },
  {
    id: "103",
    name: "Raw Spread Affiliates",
    description: "Commission plan tailored for raw-spread account holders.",
    status: false,
    ib_user_count: 5,
    created_at: daysAgoIso(45),
    updated_at: daysAgoIso(30),
    account_types: [
      {
        account_type_id: "4",
        account_type_name: "Raw Spread",
        commissions: makeCommissions(7),
      },
    ],
  },
  {
    id: "104",
    name: "Islamic Partner Plan",
    description: "Swap-free plan for partners onboarding Islamic accounts.",
    status: true,
    ib_user_count: 9,
    created_at: daysAgoIso(20),
    updated_at: daysAgoIso(1),
    account_types: [
      {
        account_type_id: "5",
        account_type_name: "Islamic",
        commissions: makeCommissions(5),
      },
      {
        account_type_id: "1",
        account_type_name: "Standard",
        commissions: makeCommissions(8),
      },
    ],
  },
];

export const mockAdminIbPlansApi = {
  list: async (_opts: { token?: string | null }) => {
    await delay(500);
    return { data: mockPlans };
  },

  getById: async (id: string, _token?: string | null) => {
    await delay(350);
    const plan = mockPlans.find((p) => String(p.id) === String(id));
    return { data: plan ?? null };
  },

  create: async (body: any, _token?: string | null) => {
    await delay(600);
    const created = {
      id: String(Date.now()),
      name: body?.name ?? "",
      description: body?.description ?? "",
      status: Boolean(body?.status ?? 1),
      ib_user_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      account_types: (body?.account_types ?? []).map((at: any) => ({
        account_type_id: String(at.account_type_id),
        account_type_name:
          MOCK_ACCOUNT_TYPES.find((o) => o.id === String(at.account_type_id))?.name ??
          `Account Type ${at.account_type_id}`,
        commissions: at.commissions ?? makeCommissions(5),
      })),
    };
    mockPlans = [created, ...mockPlans];
    return { data: created };
  },

  patch: async (id: string, body: any, _token?: string | null) => {
    await delay(600);
    const idx = mockPlans.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return { data: null };
    const updated = {
      ...mockPlans[idx],
      name: body?.name ?? mockPlans[idx].name,
      description: body?.description ?? mockPlans[idx].description,
      status: body?.status !== undefined ? Boolean(body.status) : mockPlans[idx].status,
      account_types:
        body?.account_types?.map((at: any) => ({
          account_type_id: String(at.account_type_id),
          account_type_name:
            MOCK_ACCOUNT_TYPES.find((o) => o.id === String(at.account_type_id))?.name ??
            `Account Type ${at.account_type_id}`,
          commissions: at.commissions ?? makeCommissions(5),
        })) ?? mockPlans[idx].account_types,
      updated_at: nowIso(),
    };
    mockPlans = [...mockPlans.slice(0, idx), updated, ...mockPlans.slice(idx + 1)];
    return { data: updated };
  },

  delete: async (id: string, _token?: string | null) => {
    await delay(400);
    mockPlans = mockPlans.filter((p) => String(p.id) !== String(id));
    return { data: { success: true } };
  },
};

export const mockAdminAccountTypesApi = {
  list: async (_opts: { token?: string | null }) => {
    await delay(300);
    return { data: { accountTypes: MOCK_ACCOUNT_TYPES } };
  },

  getById: async (id: string, _token?: string | null) => {
    await delay(300);
    const accountType = MOCK_ACCOUNT_TYPES.find((a) => a.id === String(id));
    if (!accountType) return { data: null };
    return {
      data: {
        ...accountType,
        commissions: makeCommissions(accountTypeCommissionSeed[accountType.id] ?? 5),
      },
    };
  },
};