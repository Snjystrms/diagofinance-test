import type {
  AdminBankDetailCreateBody,
  AdminBankDetailItem,
  AdminBankDetailUpdateBody,
  AdminUsersListApiData,
} from "@/lib/api";

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
