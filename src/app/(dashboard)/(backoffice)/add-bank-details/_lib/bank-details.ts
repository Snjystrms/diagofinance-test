import type {
  AdminBankDetailCreateBody,
  AdminBankDetailItem,
  AdminBankDetailUpdateBody,
  AdminBankDetailsUser,
  AdminUsersListApiData,
} from "@/lib/api";

const pickNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
};

/** Path segment for GET/PUT/DELETE `/admin/bank-details/{id}` — backend may use UUID or numeric id. */
export function resolveBankDetailRouteId(detail: AdminBankDetailItem | Record<string, unknown>): string | null {
  const r = detail as Record<string, unknown>;
  return (
    pickNonEmptyString(r.uuid) ??
    pickNonEmptyString(r.bank_detail_uuid) ??
    pickNonEmptyString(r.bankDetailUuid) ??
    pickNonEmptyString(r.record_uuid) ??
    (r.id !== undefined && r.id !== null ? pickNonEmptyString(String(r.id)) : null)
  );
}

function normalizeUserFromRow(raw: unknown): AdminBankDetailsUser | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const u = raw as Record<string, unknown>;
  const id = Number(u.id);
  return {
    id: Number.isFinite(id) ? id : 0,
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    mobile: String(u.mobile ?? ""),
    uuid: String(u.uuid ?? ""),
  };
}

/** One list row from `/admin/bank-details` — coalesce identifier fields the API may omit or rename. */
export function normalizeAdminBankDetailRow(raw: unknown): AdminBankDetailItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const routeId = resolveBankDetailRouteId(r);
  if (!routeId) return null;

  const id = Number(r.id);
  const userId = Number(r.user_id);

  return {
    id: Number.isFinite(id) ? id : 0,
    uuid: routeId,
    user_id: Number.isFinite(userId) ? userId : 0,
    user: normalizeUserFromRow(r.user),
    account_holder_name: String(r.account_holder_name ?? ""),
    account_number: String(r.account_number ?? ""),
    iban_number: String(r.iban_number ?? ""),
    swift_ifsc_code: String(r.swift_ifsc_code ?? ""),
    bank_name: String(r.bank_name ?? ""),
    address: String(r.address ?? ""),
    country: String(r.country ?? ""),
  };
}

export function extractBankDetailListRows(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.rows)) return o.rows;
  if (Array.isArray(o.data)) return o.data;
  if (o.data && typeof o.data === "object") {
    const inner = o.data as Record<string, unknown>;
    if (Array.isArray(inner.rows)) return inner.rows;
    if (Array.isArray(inner.data)) return inner.data;
  }
  return [];
}

export type AdminUserOption = {
  uuid: string;
  name: string;
  email: string;
  mobile: string;
};

export type BankDetailFormValues = {
  user_uuid: string;
  account_holder_name: string;
  account_number: string;
  iban_number: string;
  swift_ifsc_code: string;
  bank_name: string;
  address: string;
  country: string;
};

export const emptyBankDetailForm = (): BankDetailFormValues => ({
  user_uuid: "",
  account_holder_name: "",
  account_number: "",
  iban_number: "",
  swift_ifsc_code: "",
  bank_name: "",
  address: "",
  country: "",
});

export const toBankDetailUpdatePayload = (
  values: BankDetailFormValues
): AdminBankDetailUpdateBody => ({
  account_holder_name: values.account_holder_name.trim(),
  account_number: values.account_number.trim(),
  iban_number: values.iban_number.trim(),
  swift_ifsc_code: values.swift_ifsc_code.trim(),
  bank_name: values.bank_name.trim(),
  address: values.address.trim(),
  country: values.country.trim(),
});

export const toBankDetailCreatePayload = (
  values: BankDetailFormValues
): AdminBankDetailCreateBody => ({
  user_uuid: values.user_uuid.trim(),
  ...toBankDetailUpdatePayload(values),
});

export const validateBankDetailForm = (
  values: BankDetailFormValues,
  options: { requireUserUuid: boolean }
) => {
  if (options.requireUserUuid && !values.user_uuid.trim()) {
    return "Please select a user.";
  }

  if (!values.account_holder_name.trim()) {
    return "Account holder name is required.";
  }

  if (!values.account_number.trim()) {
    return "Account number is required.";
  }

  if (!values.swift_ifsc_code.trim()) {
    return "Swift/IFSC code is required.";
  }

  if (!values.bank_name.trim()) {
    return "Bank name is required.";
  }

  if (!values.address.trim()) {
    return "Bank address is required.";
  }

  if (!values.country.trim()) {
    return "Country is required.";
  }

  return null;
};

export const filterBankDetails = (rows: AdminBankDetailItem[], search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.account_holder_name,
      row.account_number,
      row.bank_name,
      row.country,
      row.uuid,
      row.user?.name,
      row.user?.email,
      row.user?.uuid,
      row.user?.mobile,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
};

export const mapBankDetailToForm = (detail: AdminBankDetailItem): BankDetailFormValues => ({
  user_uuid: detail.user?.uuid ?? "",
  account_holder_name: detail.account_holder_name ?? "",
  account_number: detail.account_number ?? "",
  iban_number: detail.iban_number ?? "",
  swift_ifsc_code: detail.swift_ifsc_code ?? "",
  bank_name: detail.bank_name ?? "",
  address: detail.address ?? "",
  country: detail.country ?? "",
});

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

export const extractAdminUserOptions = (payload?: AdminUsersListApiData | null): AdminUserOption[] => {
  if (!payload) return [];

  const pick = (value: unknown) => (Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []);

  const directUsers = pick(payload.users);
  if (directUsers.length) return directUsers.map(normalizeUserOption);

  const directItems = pick(payload.items);
  if (directItems.length) return directItems.map(normalizeUserOption);

  if (Array.isArray(payload.data)) {
    return (payload.data as unknown as Array<Record<string, unknown>>).map(normalizeUserOption);
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
