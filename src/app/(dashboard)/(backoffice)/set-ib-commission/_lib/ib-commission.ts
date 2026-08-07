import type {
  AdminIbCommissionCreateBody,
  AdminIbCommissionItem,
  AdminIbCommissionUpdateBody,
  AdminIbPlanCrudItem,
  AdminIbPlanCrudListData,
  AdminUsersListApiData,
} from "@/lib/api";

const pickNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
};

const pickNullableString = (value: unknown): string | undefined | null => {
  if (value === null || value === undefined) return value ?? null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
};

export const coerceBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "active", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "inactive", "no", "off", ""].includes(normalized))
      return false;
  }
  return fallback;
};

export const extractIbCommissionListRows = (data: unknown): unknown[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.ibCommissions)) return o.ibCommissions;
  if (Array.isArray(o.rows)) return o.rows;
  if (Array.isArray(o.data)) return o.data;
  if (o.data && typeof o.data === "object") {
    const inner = o.data as Record<string, unknown>;
    if (Array.isArray(inner.ibCommissions)) return inner.ibCommissions;
    if (Array.isArray(inner.rows)) return inner.rows;
    if (Array.isArray(inner.data)) return inner.data;
  }
  return [];
};

export const extractIbCommissionPagination = (data: unknown) => {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  const pagination =
    o.pagination && typeof o.pagination === "object"
      ? (o.pagination as Record<string, unknown>)
      : undefined;
  if (!pagination) return undefined;

  const totalPages = Number(
    pagination.total_pages ?? pagination.totalPages ?? 1,
  );
  const totalIbCommissions = Number(
    pagination.total_ib_commissions ?? pagination.total ?? 0,
  );

  return {
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    totalIbCommissions: Number.isFinite(totalIbCommissions)
      ? totalIbCommissions
      : 0,
  };
};

export const normalizeAdminIbCommissionRow = (
  raw: unknown,
): AdminIbCommissionItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const userUuid = pickNonEmptyString(r.user_uuid);
  if (!userUuid) return null;

  const id = Number(r.id);
  return {
    id: Number.isFinite(id) ? id : 0,
    user_uuid: userUuid,
    user_email: String(r.user_email ?? ""),
    user_name: String(r.user_name ?? ""),
    ib_plan_id: (r.ib_plan_id ?? "") as number | string,
    plan_name: String(r.plan_name ?? ""),
    status: (r.status ?? false) as boolean | number | string,
    assigned_by: pickNullableString(r.assigned_by),
    created_at: pickNullableString(r.created_at) ?? undefined,
    updated_at: pickNullableString(r.updated_at) ?? undefined,
  };
};

export type AdminUserOption = {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
};

export type IbPlanOption = {
  id: string;
  name: string;
};

export type IbCommissionFormValues = {
  user_uuid: string;
  user_name: string;
  user_email: string;
  ib_plan_id: string;
  status: boolean;
};

export const emptyIbCommissionForm = (): IbCommissionFormValues => ({
  user_uuid: "",
  user_name: "",
  user_email: "",
  ib_plan_id: "",
  status: false,
});

export const toIbCommissionCreatePayload = (
  values: IbCommissionFormValues,
): AdminIbCommissionCreateBody => ({
  ib_plan_id: Number(values.ib_plan_id),
  user_uuid: values.user_uuid.trim(),
});

export const toIbCommissionUpdatePayload = (
  values: IbCommissionFormValues,
): AdminIbCommissionUpdateBody => ({
  ib_plan_id: Number(values.ib_plan_id),
  status: values.status,
});

export const validateIbCommissionForm = (
  values: IbCommissionFormValues,
  options: { requireUserUuid: boolean },
): string | null => {
  if (options.requireUserUuid && !values.user_uuid.trim()) {
    return "Please select a user.";
  }
  if (!values.ib_plan_id) {
    return "Please select an IB plan.";
  }
  return null;
};

export const mapIbCommissionToForm = (
  detail: AdminIbCommissionItem,
): IbCommissionFormValues => ({
  user_uuid: detail.user_uuid ?? "",
  user_name: detail.user_name ?? "",
  user_email: detail.user_email ?? "",
  ib_plan_id: String(detail.ib_plan_id ?? ""),
  status: coerceBoolean(detail.status, false),
});

export const filterIbCommissions = (
  rows: AdminIbCommissionItem[],
  search: string,
) => {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.user_name,
      row.user_email,
      row.user_uuid,
      row.plan_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
};

export const extractIbPlanOptions = (
  payload?: AdminIbPlanCrudListData | null,
): IbPlanOption[] => {
  if (!payload) return [];
  const plans: AdminIbPlanCrudItem[] = Array.isArray(payload.ibPlans)
    ? payload.ibPlans
    : [];
  return plans
    .filter((plan) => plan.id !== undefined && plan.id !== null)
    .map((plan) => ({
      id: String(plan.id),
      name: String(plan.name ?? `Plan ${plan.id}`),
    }));
};

const normalizeUserOption = (raw: Record<string, unknown>): AdminUserOption => {
  const firstName = String(raw.first_name ?? "").trim();
  const lastName = String(raw.last_name ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    uuid: String(raw.uuid ?? ""),
    name: fullName || String(raw.name ?? "-"),
    email: String(raw.email ?? ""),
    mobile: String(raw.mobile ?? ""),
  };
};

export const extractAdminUserOptions = (
  payload?: AdminUsersListApiData | null,
): AdminUserOption[] => {
  if (!payload) return [];

  const pick = (value: unknown) =>
    Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

  const directUsers = pick(payload.users);
  if (directUsers.length) return directUsers.map(normalizeUserOption);

  const directItems = pick(payload.items);
  if (directItems.length) return directItems.map(normalizeUserOption);

  if (Array.isArray(payload.data)) {
    return (payload.data as unknown as Array<Record<string, unknown>>).map(
      normalizeUserOption,
    );
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>;
    const nestedUsers = pick(nested.users);
    if (nestedUsers.length) return nestedUsers.map(normalizeUserOption);

    const nestedItems = pick(nested.items);
    if (nestedItems.length) return nestedItems.map(normalizeUserOption);

    const nestedData = pick(nested.data);
    if (nestedData.length) return nestedData.map(normalizeUserOption);
  }

  return [];
};
