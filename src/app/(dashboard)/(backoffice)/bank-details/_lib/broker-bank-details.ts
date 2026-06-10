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

export type BrokerBankDetailFieldErrors = Partial<
  Record<keyof BrokerBankDetailFormValues, string>
>;

export const validateBrokerBankDetailForm = (
  values: BrokerBankDetailFormValues
): BrokerBankDetailFieldErrors => {
  const errors: BrokerBankDetailFieldErrors = {};

  if (!values.account_holder_name.trim()) {
    errors.account_holder_name = "Account holder name is required.";
  } else if (!/^[a-zA-Z\s.'-]{2,80}$/.test(values.account_holder_name.trim())) {
    errors.account_holder_name = "Enter a valid account holder name.";
  }

  if (!values.account_number.trim()) {
    errors.account_number = "Account number is required.";
  } else if (!/^\d{6,18}$/.test(values.account_number.trim())) {
    errors.account_number = "Account number must be 6-18 digits only.";
  }

  if (!values.bank_name.trim()) {
    errors.bank_name = "Bank name is required.";
  } else if (values.bank_name.trim().length < 2) {
    errors.bank_name = "Bank name must be at least 2 characters.";
  }

  if (!values.country.trim()) {
    errors.country = "Country is required.";
  }

  if (
    values.iban_number.trim() &&
    !/^[A-Z]{2}[A-Z0-9]{13,32}$/.test(values.iban_number.trim().toUpperCase())
  ) {
    errors.iban_number = "Enter a valid IBAN number.";
  }

  if (!values.swift_ifsc_code.trim()) {
    errors.swift_ifsc_code = "Swift / IFSC code is required.";
  } else if (
    !/^[A-Z0-9]{8,15}$/.test(values.swift_ifsc_code.trim().toUpperCase())
  ) {
    errors.swift_ifsc_code = "Enter a valid Swift / IFSC code.";
  }

  if (!values.address.trim()) {
    errors.address = "Address is required.";
  } else if (values.address.trim().length < 5) {
    errors.address = "Address must be at least 5 characters.";
  }

  return errors;
};

export const hasBrokerBankDetailErrors = (
  errors: BrokerBankDetailFieldErrors
): boolean => Object.keys(errors).length > 0;

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
