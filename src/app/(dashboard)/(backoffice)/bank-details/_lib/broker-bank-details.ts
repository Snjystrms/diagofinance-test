import type { BrokerBankDetailItem, BrokerBankDetailPayload } from "@/lib/api";

export type BrokerBankDetailFormValues = BrokerBankDetailPayload;

export const emptyBrokerBankDetailForm = (): BrokerBankDetailFormValues => ({
  account_holder_name: "",
  account_number: "",
  address: "",
  bank_name: "",
  country: "",
  iban_number: "",
  swift_ifsc_code: "",
  is_active: true,
});

export const isBrokerBankDetailActive = (detail: Pick<BrokerBankDetailItem, "is_active">) =>
  detail.is_active === true || detail.is_active === 1;

export const toBrokerBankDetailPayload = (
  values: BrokerBankDetailFormValues
): BrokerBankDetailPayload => ({
  account_holder_name: values.account_holder_name.trim(),
  account_number: values.account_number.trim(),
  address: values.address.trim(),
  bank_name: values.bank_name.trim(),
  country: values.country.trim(),
  iban_number: values.iban_number.trim(),
  swift_ifsc_code: values.swift_ifsc_code.trim(),
  is_active: values.is_active,
});

export const mapBrokerBankDetailToForm = (
  detail: BrokerBankDetailItem
): BrokerBankDetailFormValues => ({
  account_holder_name: detail.account_holder_name ?? "",
  account_number: detail.account_number ?? "",
  address: detail.address ?? "",
  bank_name: detail.bank_name ?? "",
  country: detail.country ?? "",
  iban_number: detail.iban_number ?? "",
  swift_ifsc_code: detail.swift_ifsc_code ?? "",
  is_active: isBrokerBankDetailActive(detail),
});

export const validateBrokerBankDetailForm = (
  values: BrokerBankDetailFormValues
) => {
  if (!values.account_holder_name.trim()) {
    return "Account holder name is required.";
  }

  if (!values.account_number.trim()) {
    return "Account number is required.";
  }

  if (!values.bank_name.trim()) {
    return "Bank name is required.";
  }

  if (!values.country.trim()) {
    return "Country is required.";
  }

  if (!values.iban_number.trim()) {
    return "IBAN number is required.";
  }

  if (!values.swift_ifsc_code.trim()) {
    return "Swift / IFSC code is required.";
  }

  if (!values.address.trim()) {
    return "Address is required.";
  }

  return null;
};

export const filterBrokerBankDetails = (
  rows: BrokerBankDetailItem[],
  search: string
) => {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.account_holder_name,
      row.account_number,
      row.address,
      row.bank_name,
      row.country,
      row.iban_number,
      row.swift_ifsc_code,
      String(row.id),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
};
