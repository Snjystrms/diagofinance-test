"use client";

import { Scale, Settings, FileText, Loader2, CalendarIcon, Pencil, X, User, FileCheck, Activity, Shield, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { GetCity, GetCountries, GetState } from "react-country-state-city";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PremiumDarkCard } from "@/components/ui/premium-dark-card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProfileContentSkeleton } from "@/components/loading/client-page-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { FALLBACK_COUNTRY_OPTIONS } from "@/lib/country-options";
import type { LocationCountryOption } from "@/lib/country-options";
import {
  authApi,
  admin2FAApi,
  manager2FAApi,
  type UserBankDetailsData,
  type ProfileViewResponse,
  type UserProfileUpdatePayload,
} from "@/lib/api";
import {
  sanitizeDigits,
  sanitizePersonText,
  sanitizeUppercase,
} from "@/components/forms/validated-fields";
import { TwoFactorModal } from "@/components/two-factor-modal";
import {
  ProfileActivityTab,
  ProfileBankDetailsTab,
  ProfileSecurityTab,
} from "@/components/profile/view_profile/components/profile-content-tabs";

type ProfileFormSection = "personal" | "bank";

type ProfileFormField =
  | "first_name"
  | "last_name"
  | "mobile"
  | "country_code"
  | "dob"
  | "address"
  | "passport_id_number"
  | "pin_code"
  | "nationality"
  | "employment_status"
  | "tax_number"
  | "client_type"
  | "country"
  | "state"
  | "city"
  | "annual_income"
  | "source_of_income"
  | "estimated_net_worth"
  | "purpose_of_opening_account"
  | "estimated_annual_amount";

type LocationMode = "select" | "other";

type LocationStateOption = {
  id: number;
  name: string;
  hasCities: boolean;
};

type LocationCityOption = {
  id: number;
  name: string;
};

type BankDetailsFormState = {
  client: string;
  accountName: string;
  accountNumber: string;
  ifscSwiftCode: string;
  ibanNumber: string;
  bankName: string;
  bankAddress: string;
  country: string;
  bookBankFileName: string;
};

type BankDetailsField =
  | "accountName"
  | "accountNumber"
  | "ifscSwiftCode"
  | "ibanNumber"
  | "bankName"
  | "bankAddress"
  | "country"
  | "bookBankFileName";

type PersonalEditSnapshot = {
  user: Pick<ProfileViewResponse["user"], "first_name" | "last_name" | "mobile" | "country_code">;
  personal_information: ProfileViewResponse["personal_information"];
};

const LOCATION_OTHER_VALUE = "__other__";

const normalizeLocationLabel = (value?: string | null) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const findLocationOptionByName = <T extends { name: string }>(options: T[], value?: string | null) => {
  const normalizedValue = normalizeLocationLabel(value);
  if (!normalizedValue) {
    return undefined;
  }

  return options.find((option) => normalizeLocationLabel(option.name) === normalizedValue);
};

export default function ProfileContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileViewResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [personalEditSnapshot, setPersonalEditSnapshot] = useState<PersonalEditSnapshot | null>(null);
  const [bankEditSnapshot, setBankEditSnapshot] = useState<BankDetailsFormState | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dobDate, setDobDate] = useState<Date | undefined>(undefined);
  const [dobMonth, setDobMonth] = useState<Date | undefined>(undefined);
  const [dobValue, setDobValue] = useState("");
  const [validationErrors, setValidationErrors] = useState<Partial<Record<ProfileFormField, string>>>({});
  const [financialCurrency, setFinancialCurrency] = useState("USD");
  const [countryOptions, setCountryOptions] = useState<LocationCountryOption[]>(() =>
    FALLBACK_COUNTRY_OPTIONS.slice().sort((left, right) => left.name.localeCompare(right.name))
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [stateOptions, setStateOptions] = useState<LocationStateOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationCityOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [countryMode, setCountryMode] = useState<LocationMode>("select");
  const [stateMode, setStateMode] = useState<LocationMode>("select");
  const [cityMode, setCityMode] = useState<LocationMode>("select");
  const [bankCountryMode, setBankCountryMode] = useState<LocationMode>("select");
  const [selectedBankCountryId, setSelectedBankCountryId] = useState<number | null>(null);
  const [bankDetailsRecordId, setBankDetailsRecordId] = useState<number | null>(null);
  const [bankDetailsList, setBankDetailsList] = useState<UserBankDetailsData[]>([]);
  const [bankDetailsDeletingId, setBankDetailsDeletingId] = useState<number | null>(null);
  const [pendingDeleteBankId, setPendingDeleteBankId] = useState<number | null>(null);
  const [passbookPhotoFile, setPassbookPhotoFile] = useState<File | null>(null);
  const [bankDetailsSaving, setBankDetailsSaving] = useState(false);
  const [bankValidationErrors, setBankValidationErrors] = useState<Partial<Record<BankDetailsField, string>>>({});
  const [locationHydrated, setLocationHydrated] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetailsFormState>({
    client: "primary-client",
    accountName: "",
    accountNumber: "",
    ifscSwiftCode: "",
    ibanNumber: "",
    bankName: "",
    bankAddress: "",
    country: "",
    bookBankFileName: "",
  });

  const FINANCIAL_CURRENCY_OPTIONS = [
    { value: "USD", label: "US Dollar" },
    { value: "INR", label: "Indian Rupee" },
    { value: "EUR", label: "Euro" },
    { value: "GBP", label: "British Pound" },
    { value: "AED", label: "UAE Dirham" },
  ] as const;

  const BANK_CLIENT_OPTIONS = [
    { value: "primary-client", label: "Primary Client" },
    { value: "joint-holder", label: "Joint Holder" },
    { value: "corporate-account", label: "Corporate Account" },
  ] as const;

  const updateBankDetails = (field: keyof BankDetailsFormState, value: string) => {
    setBankDetails((current) => ({
      ...current,
      [field]: value,
    }));

    if (
      field === "accountName" ||
      field === "accountNumber" ||
      field === "ifscSwiftCode" ||
      field === "ibanNumber" ||
      field === "bankName" ||
      field === "bankAddress" ||
      field === "country" ||
      field === "bookBankFileName"
    ) {
      setBankValidationErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const applyBankDetailsToForm = (details: UserBankDetailsData) => {
    setBankDetailsRecordId(details.id);
    setPassbookPhotoFile(null);
    setBankDetails((current) => ({
      ...current,
      accountName: details.account_holder_name ?? "",
      accountNumber: details.account_number ?? "",
      ifscSwiftCode: details.swift_ifsc_code ?? "",
      ibanNumber: details.iban_number ?? "",
      bankName: details.bank_name ?? "",
      bankAddress: details.address ?? "",
      country: details.country ?? "",
      bookBankFileName: details.passbook_photo_url ?? "",
    }));
  };

  const resetBankForm = () => {
    setBankDetailsRecordId(null);
    setPassbookPhotoFile(null);
    setBankDetails({
      client: "primary-client",
      accountName: "",
      accountNumber: "",
      ifscSwiftCode: "",
      ibanNumber: "",
      bankName: "",
      bankAddress: "",
      country: "",
      bookBankFileName: "",
    });
  };

  const refreshBankDetailsList = async (preferredId?: number | null) => {
    if (!token) return;
    try {
      const response = await authApi.getBankDetails(token);
      const list: UserBankDetailsData[] = Array.isArray(response.data) ? response.data : [];
      setBankDetailsList(list);

      if (list.length === 0) {
        resetBankForm();
        return;
      }

      const nextSelected =
        list.find((entry) => entry.id === preferredId) ??
        list.find((entry) => entry.id === bankDetailsRecordId) ??
        list[0];
      applyBankDetailsToForm(nextSelected);
    } catch (error) {
      console.error("Error refreshing bank details:", error);
    }
  };

  const normalizeCountryCodeForInput = (value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return "";
    const stringValue = String(value).trim();
    return stringValue.startsWith("+") ? stringValue : `+${stringValue}`;
  };

  const normalizeProfileResponse = (data: ProfileViewResponse): ProfileViewResponse => ({
    ...data,
    user: {
      ...data.user,
      country_code: normalizeCountryCodeForInput(data.user.country_code),
      google_2FA_status: Boolean(data.user.google_2FA_status),
    },
  });

  const clearValidationError = (field: ProfileFormField) => {
    setValidationErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateProfileSection = (section: ProfileFormSection) => {
    if (!profileData) {
      return { first_name: "Profile data is unavailable." } as Partial<Record<ProfileFormField, string>>;
    }

    const errors: Partial<Record<ProfileFormField, string>> = {};
    const { user: profileUser, personal_information } = profileData;

    const requireText = (field: ProfileFormField, value: string | null | undefined, label: string) => {
      if (!value || !value.trim()) {
        errors[field] = `${label} is required.`;
      }
    };

    if (section === "personal") {
      requireText("first_name", profileUser.first_name, "First name");
      requireText("last_name", profileUser.last_name, "Last name");
      requireText("mobile", profileUser.mobile, "Mobile number");
      requireText("country_code", String(profileUser.country_code ?? ""), "Country code");
      requireText("dob", formatDateForInput(personal_information.dob), "Date of birth");
      requireText("address", personal_information.address, "Address");
      // Document number validation removed - allow users to enter any format
      requireText("pin_code", personal_information.pin_code, "PIN code");
      requireText("nationality", personal_information.nationality, "Nationality");
      requireText("employment_status", personal_information.employment_status, "Employment status");
      // requireText("tax_number", personal_information.tax_number, "Tax number");
      requireText("client_type", personal_information.client_type, "Client type");
      requireText("country", personal_information.country, "Country");
      requireText("state", personal_information.state, "State");
      requireText("city", personal_information.city, "City");

      if (profileUser.first_name?.trim() && profileUser.first_name.trim().length < 2) {
        errors.first_name = "First name must be at least 2 characters.";
      }

      if (profileUser.last_name?.trim() && profileUser.last_name.trim().length < 2) {
        errors.last_name = "Last name must be at least 2 characters.";
      }

      if (profileUser.mobile?.trim() && !/^\d{8,15}$/.test(profileUser.mobile.trim())) {
        errors.mobile = "Mobile number must contain 10 digits.";
      }

      if (String(profileUser.country_code ?? "").trim() && !/^\+\d{1,4}$/.test(String(profileUser.country_code).trim())) {
        errors.country_code = "Country code must look like +91.";
      }

      const normalizedDob = formatDateForInput(personal_information.dob);
      if (normalizedDob) {
        const dob = new Date(normalizedDob);
        if (!isValidDate(dob) || dob > new Date()) {
          errors.dob = "Date of birth must be a valid past date.";
        }
      }

      if (personal_information.pin_code?.trim() && !/^[A-Za-z0-9-]{4,12}$/.test(personal_information.pin_code.trim())) {
        errors.pin_code = "PIN code must be 4 to 12 letters or digits.";
      }
    }

    return errors;
  };

  const sanitizeCountryCodeInput = (value: string) => {
    const trimmed = value.replace(/[^\d+]/g, "");
    const withoutExtraPluses = trimmed.replace(/\+/g, "");
    return withoutExtraPluses ? `+${withoutExtraPluses.slice(0, 4)}` : "";
  };

  const sanitizeMoneyInput = (value: string) => {
    const normalized = value.replace(/[^\d.]/g, "");
    const [integerPart, ...decimalParts] = normalized.split(".");
    if (!decimalParts.length) {
      return integerPart;
    }
    return `${integerPart}.${decimalParts.join("").slice(0, 2)}`;
  };

  const sanitizeIdentifierInput = (value: string, maxLength = 20) =>
    sanitizeUppercase(value, maxLength).replace(/[^A-Z0-9-]/g, "");

  const parseOptionalMoneyValue = (value: string) => {
    const sanitized = sanitizeMoneyInput(value);
    return sanitized ? Number(sanitized) : null;
  };

  const formatMoneyPlaceholder = (label: string) => `Enter ${label.toLowerCase()} in ${financialCurrency}`;

  const loadStatesForCountry = async (countryId: number) => {
    const states = ((await GetState(countryId)) as LocationStateOption[]).slice().sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    setStateOptions(states);
    return states;
  };

  const loadCitiesForState = async (countryId: number, stateId: number) => {
    const cities = ((await GetCity(countryId, stateId)) as LocationCityOption[]).slice().sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    setCityOptions(cities);
    return cities;
  };

  const handleCountrySelection = async (value: string) => {
    if (!profileData) return;

    clearValidationError("country");
    clearValidationError("state");
    clearValidationError("city");

    setSelectedStateId(null);
    setSelectedCityId(null);
    setStateOptions([]);
    setCityOptions([]);
    setStateMode("select");
    setCityMode("select");

    if (value === LOCATION_OTHER_VALUE) {
      setCountryMode("other");
      setSelectedCountryId(null);
      setProfileData((current) =>
        current
          ? {
              ...current,
              personal_information: {
                ...current.personal_information,
                country: null,
                state: null,
                city: null,
              },
            }
          : current
      );
      return;
    }

    const countryId = Number(value);
    const country = countryOptions.find((option) => option.id === countryId);
    if (!country) return;

    setCountryMode("select");
    setSelectedCountryId(country.id);
    setProfileData((current) =>
      current
        ? {
            ...current,
            personal_information: {
              ...current.personal_information,
              country: country.name,
              state: null,
              city: null,
            },
          }
        : current
    );

    try {
      const states = await loadStatesForCountry(country.id);
      if (states.length === 0) {
        setStateMode("other");
      }
    } catch (error) {
      console.error("Error loading states:", error);
      toast.error("Failed to load states for the selected country.");
      setStateMode("other");
    }
  };

  const handleStateSelection = async (value: string) => {
    if (!profileData) return;

    clearValidationError("state");
    clearValidationError("city");
    setSelectedCityId(null);
    setCityOptions([]);
    setCityMode("select");

    if (value === LOCATION_OTHER_VALUE) {
      setStateMode("other");
      setSelectedStateId(null);
      setProfileData((current) =>
        current
          ? {
              ...current,
              personal_information: {
                ...current.personal_information,
                state: null,
                city: null,
              },
            }
          : current
      );
      return;
    }

    if (!selectedCountryId) return;

    const stateId = Number(value);
    const state = stateOptions.find((option) => option.id === stateId);
    if (!state) return;

    setStateMode("select");
    setSelectedStateId(state.id);
    setProfileData((current) =>
      current
        ? {
            ...current,
            personal_information: {
              ...current.personal_information,
              state: state.name,
              city: null,
            },
          }
        : current
    );

    try {
      const cities = await loadCitiesForState(selectedCountryId, state.id);
      if (cities.length === 0) {
        setCityMode("other");
      }
    } catch (error) {
      console.error("Error loading cities:", error);
      toast.error("Failed to load cities for the selected state.");
      setCityMode("other");
    }
  };

  const handleCitySelection = (value: string) => {
    if (!profileData) return;

    clearValidationError("city");

    if (value === LOCATION_OTHER_VALUE) {
      setCityMode("other");
      setSelectedCityId(null);
      setProfileData((current) =>
        current
          ? {
              ...current,
              personal_information: {
                ...current.personal_information,
                city: null,
              },
            }
          : current
      );
      return;
    }

    const cityId = Number(value);
    const city = cityOptions.find((option) => option.id === cityId);
    if (!city) return;

    setCityMode("select");
    setSelectedCityId(city.id);
    setProfileData((current) =>
      current
        ? {
            ...current,
            personal_information: {
              ...current.personal_information,
              city: city.name,
            },
          }
        : current
    );
  };

  const handleBankCountrySelection = (value: string) => {
    setBankValidationErrors((current) => {
      if (!current.country) return current;
      const next = { ...current };
      delete next.country;
      return next;
    });

    if (value === LOCATION_OTHER_VALUE) {
      setBankCountryMode("other");
      setSelectedBankCountryId(null);
      updateBankDetails("country", "");
      return;
    }

    const countryId = Number(value);
    const country = countryOptions.find((option) => option.id === countryId);
    if (!country) return;

    setBankCountryMode("select");
    setSelectedBankCountryId(country.id);
    updateBankDetails("country", country.name);
  };

  const validateBankDetails = () => {
    const errors: Partial<Record<BankDetailsField, string>> = {};
    const accountName = bankDetails.accountName.trim();
    const accountNumber = bankDetails.accountNumber.trim();
    const ifscSwiftCode = bankDetails.ifscSwiftCode.trim();
    const ibanNumber = bankDetails.ibanNumber.trim();
    const bankName = bankDetails.bankName.trim();
    const bankAddress = bankDetails.bankAddress.trim();
    const country = bankDetails.country.trim();

    if (!accountName) {
      errors.accountName = "Account holder name is required.";
    } else if (accountName.length < 2) {
      errors.accountName = "Account holder name must be at least 2 characters.";
    }

    if (!accountNumber) {
      errors.accountNumber = "Account number is required.";
    } else if (!/^[A-Z0-9-]{6,34}$/.test(accountNumber)) {
      errors.accountNumber = "Account number must be 6 to 34 uppercase letters, digits, or hyphen.";
    }

    if (!ifscSwiftCode) {
      errors.ifscSwiftCode = "IFSC / Swift code is required.";
    } else if (!/^[A-Z0-9-]{4,20}$/.test(ifscSwiftCode)) {
      errors.ifscSwiftCode = "IFSC / Swift code must be 4 to 20 uppercase letters, digits, or hyphen.";
    }

    // IBAN is optional, but if provided, validate format
    if (ibanNumber && !/^[A-Z0-9-]{10,34}$/.test(ibanNumber)) {
      errors.ibanNumber = "IBAN must be 10 to 34 uppercase letters, digits, or hyphen.";
    }

    if (!bankName) {
      errors.bankName = "Bank name is required.";
    } else if (bankName.length < 2) {
      errors.bankName = "Bank name must be at least 2 characters.";
    }

    if (!bankAddress) {
      errors.bankAddress = "Address is required.";
    } else if (bankAddress.length < 5) {
      errors.bankAddress = "Address must be at least 5 characters.";
    }

    if (!country) {
      errors.country = "Country is required.";
    }

    // Validate passbook photo - required for new entries or if not already uploaded
    if (!passbookPhotoFile && !bankDetails.bookBankFileName) {
      errors.bookBankFileName = "Passbook photo is required.";
    }

    return errors;
  };

  const handleBankDetailsSubmit = async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const errors = validateBankDetails();
    if (Object.keys(errors).length > 0) {
      setBankValidationErrors(errors);
      toast.error("Please fix the highlighted bank details fields.");
      return;
    }

    const payload = {
      account_holder_name: bankDetails.accountName.trim(),
      account_number: bankDetails.accountNumber.trim(),
      iban_number: bankDetails.ibanNumber.trim(),
      swift_ifsc_code: bankDetails.ifscSwiftCode.trim(),
      bank_name: bankDetails.bankName.trim(),
      address: bankDetails.bankAddress.trim(),
      country: bankDetails.country.trim(),
      passbook_photo: passbookPhotoFile ?? bankDetails.bookBankFileName.trim(),
    };

    try {
      setBankDetailsSaving(true);
      const editingId = bankDetailsRecordId;
      const response = editingId
        ? await authApi.updateBankDetails(editingId, payload, token)
        : await authApi.createBankDetails(payload, token);

      const savedId = response.data?.id ?? editingId ?? null;
      if (response.data) {
        applyBankDetailsToForm(response.data);
      }

      await refreshBankDetailsList(savedId);

      setIsBankEditing(false);
      setBankEditSnapshot(null);

      toast.success(
        response.message ||
          (editingId
            ? "Bank details updated successfully"
            : "Bank details added successfully")
      );
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save bank details");
    } finally {
      setBankDetailsSaving(false);
    }
  };

  const handleStartAddBankDetails = () => {
    resetBankForm();
    setBankEditSnapshot(null);
    setBankValidationErrors({});
    setLocationHydrated(false);
    setIsBankEditing(true);
  };

  const handleStartEditBankDetails = (entry: UserBankDetailsData) => {
    applyBankDetailsToForm(entry);
    setBankEditSnapshot({
      accountName: entry.account_holder_name ?? "",
      accountNumber: entry.account_number ?? "",
      ifscSwiftCode: entry.swift_ifsc_code ?? "",
      ibanNumber: entry.iban_number ?? "",
      bankName: entry.bank_name ?? "",
      bankAddress: entry.address ?? "",
      country: entry.country ?? "",
      bookBankFileName: entry.passbook_photo_url ?? "",
      client: bankDetails.client,
    });
    setBankValidationErrors({});
    setLocationHydrated(false);
    setIsBankEditing(true);
  };

  const handleRequestDeleteBankDetails = (id: number) => {
    setPendingDeleteBankId(id);
  };

  const handleCancelDeleteBankDetails = () => {
    setPendingDeleteBankId(null);
  };

  const handleConfirmDeleteBankDetails = async () => {
    const id = pendingDeleteBankId;
    if (!id || !token) {
      setPendingDeleteBankId(null);
      return;
    }

    try {
      setBankDetailsDeletingId(id);
      const response = await authApi.deleteBankDetails(id, token);
      toast.success(response.message || "Bank details deleted successfully");
      if (bankDetailsRecordId === id) {
        setIsBankEditing(false);
        setBankEditSnapshot(null);
      }
      await refreshBankDetailsList();
    } catch (error) {
      console.error("Error deleting bank details:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete bank details");
    } finally {
      setBankDetailsDeletingId(null);
      setPendingDeleteBankId(null);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCurrency = window.localStorage.getItem("profile-financial-currency");
    if (storedCurrency) {
      setFinancialCurrency(storedCurrency);
    }
  }, []);

  // Read tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const validTabs = ["personal", "activity", "security", "bank"];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const currentPath = window.location.pathname;
    router.push(`${currentPath}?tab=${value}`, { scroll: false });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("profile-financial-currency", financialCurrency);
  }, [financialCurrency]);

  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      try {
        const fetched = (await GetCountries()) as LocationCountryOption[] | undefined;
        if (cancelled) return;

        if (Array.isArray(fetched) && fetched.length > 0) {
          setCountryOptions(
            fetched.slice().sort((left, right) => left.name.localeCompare(right.name))
          );
        }
      } catch (error) {
        console.error("Error loading countries, keeping fallback list:", error);
      }
    };

    void loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profileData?.user.id) return;
    setLocationHydrated(false);
  }, [profileData?.user.id]);

  useEffect(() => {
    if (!profileData || countryOptions.length === 0 || locationHydrated) {
      return;
    }

    let cancelled = false;

    const hydrateLocationSelections = async () => {
      const matchedCountry = findLocationOptionByName(
        countryOptions,
        profileData.personal_information.country
      );

      if (!matchedCountry) {
        setCountryMode(profileData.personal_information.country ? "other" : "select");
        setStateMode(profileData.personal_information.state ? "other" : "select");
        setCityMode(profileData.personal_information.city ? "other" : "select");
        setLocationHydrated(true);
        return;
      }

      setCountryMode("select");
      setSelectedCountryId(matchedCountry.id);

      try {
        const states = await loadStatesForCountry(matchedCountry.id);
        if (cancelled) return;

        const matchedState = findLocationOptionByName(
          states,
          profileData.personal_information.state
        );

        if (!matchedState) {
          setStateMode(profileData.personal_information.state ? "other" : states.length === 0 ? "other" : "select");
          setCityMode(profileData.personal_information.city ? "other" : "select");
          setLocationHydrated(true);
          return;
        }

        setStateMode("select");
        setSelectedStateId(matchedState.id);

        const cities = await loadCitiesForState(matchedCountry.id, matchedState.id);
        if (cancelled) return;

        const matchedCity = findLocationOptionByName(
          cities,
          profileData.personal_information.city
        );

        if (!matchedCity) {
          setCityMode(profileData.personal_information.city ? "other" : cities.length === 0 ? "other" : "select");
          setLocationHydrated(true);
          return;
        }

        setCityMode("select");
        setSelectedCityId(matchedCity.id);
      } catch (error) {
        console.error("Error hydrating location selections:", error);
        setCountryMode(profileData.personal_information.country ? "other" : "select");
        setStateMode(profileData.personal_information.state ? "other" : "select");
        setCityMode(profileData.personal_information.city ? "other" : "select");
      } finally {
        if (!cancelled) {
          setLocationHydrated(true);
        }
      }
    };

    void hydrateLocationSelections();

    return () => {
      cancelled = true;
    };
  }, [countryOptions, locationHydrated, profileData]);

  useEffect(() => {
    if (!bankDetails.country || countryOptions.length === 0) {
      return;
    }

    const matchedBankCountry = findLocationOptionByName(countryOptions, bankDetails.country);
    if (matchedBankCountry) {
      setBankCountryMode("select");
      setSelectedBankCountryId(matchedBankCountry.id);
      return;
    }

    setBankCountryMode("other");
    setSelectedBankCountryId(null);
  }, [bankDetails.country, countryOptions]);

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const [profileResponse, bankResponse] = await Promise.all([
          authApi.getProfileView(token),
          authApi.getBankDetails(token).catch(() => null),
        ]);

        if (profileResponse.data) {
          const normalizedProfile = normalizeProfileResponse(profileResponse.data);
          setProfileData(normalizedProfile);
          setIs2FAEnabled(Boolean(normalizedProfile.user?.google_2FA_status));
          
          // Initialize DOB date state
          if (normalizedProfile.personal_information?.dob) {
            try {
              const dobDate = new Date(normalizedProfile.personal_information.dob);
              if (isValidDate(dobDate)) {
                setDobDate(dobDate);
                setDobMonth(dobDate);
                setDobValue(formatDateDisplay(dobDate));
              }
            } catch (error) {
              console.error("Error parsing DOB:", error);
            }
          } else {
            setDobDate(undefined);
            setDobMonth(undefined);
            setDobValue("");
          }
        }

        if (bankResponse?.data) {
          const list: UserBankDetailsData[] = Array.isArray(bankResponse.data)
            ? bankResponse.data
            : [bankResponse.data];
          setBankDetailsList(list);
          if (list.length > 0) {
            applyBankDetailsToForm(list[0]);
          } else {
            resetBankForm();
          }
        } else {
          setBankDetailsList([]);
          resetBankForm();
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  // Check 2FA status when component mounts and when user changes
  useEffect(() => {
    if (user?.id && token) {
      checkTwoFactorStatus();
    }
  }, [user, token]);

  // Handle hash routing for tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'personal' || hash === 'account' || hash === 'activity' || hash === 'security' || hash === 'bank') {
        setActiveTab(hash);
      }
      
      // Listen for hash changes
      const handleHashChange = () => {
        const newHash = window.location.hash.replace('#', '');
        if (newHash === 'personal' || newHash === 'account' || newHash === 'activity' || newHash === 'security' || newHash === 'bank') {
          setActiveTab(newHash);
        }
      };
      
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const checkTwoFactorStatus = async () => {
    if (!user?.id || !token) return;
    
    setIsLoading2FAStatus(true);
    
    try {
      // Use appropriate API based on user type
      const isAdmin = user.type === 'admin';
      const isManager = user.type === 'manager' || user.type === 'subadmin';
      let response;
      
      if (isAdmin) {
        response = await admin2FAApi.getTwoFactorStatus(user.id, token);
      } else if (isManager) {
        response = await manager2FAApi.getTwoFactorStatus(user.id, token);
      } else {
        response = await authApi.getTwoFactorStatus(Number(user.id), token);
      }
      
      if (response.success && response.data) {
        setIs2FAEnabled(Boolean(response.data.google_2FA_status));
        // Also update profileData if it exists
        if (profileData) {
          setProfileData({
            ...profileData,
            user: {
              ...profileData.user,
              google_2FA_status: Boolean(response.data.google_2FA_status),
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setIsLoading2FAStatus(false);
    }
  };

  const handle2FAStatusChange = async () => {
    // Refresh 2FA status and profile data
    await checkTwoFactorStatus();
    // Also reload profile view to get updated data
    if (token) {
      try {
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          setProfileData(normalizeProfileResponse(response.data));
        }
      } catch (error) {
        console.error("Error reloading profile:", error);
      }
    }
    // Dispatch custom event to notify profile-header to refresh
    window.dispatchEvent(new CustomEvent('2fa-status-changed'));
  };

  const buildProfileUpdatePayload = (section: ProfileFormSection): UserProfileUpdatePayload | null => {
    if (!profileData) {
      return null;
    }

    const { user: profileUser, personal_information } = profileData;
    const basicProfilePayload: UserProfileUpdatePayload = {
      first_name: profileUser.first_name || "",
      last_name: profileUser.last_name || "",
      mobile: profileUser.mobile || "",
      country_code: normalizeCountryCodeForInput(profileUser.country_code),
    };

    const personalInformationPayload: UserProfileUpdatePayload = {
      dob: formatDateForInput(personal_information.dob),
      address: personal_information.address || "",
      pin_code: personal_information.pin_code || "",
      nationality: personal_information.nationality || "",
      employment_status: personal_information.employment_status || "",
      tax_number: personal_information.tax_number || "",
      client_type: personal_information.client_type || "",
      country: personal_information.country || "",
      state: personal_information.state || "",
      city: personal_information.city || "",
    };

    // Send the same document ID value to both passport_id_number and other_id_number
    if (personal_information.passport_id_number?.trim()) {
      const documentId = personal_information.passport_id_number.trim();
      personalInformationPayload.passport_id_number = documentId;
      personalInformationPayload.other_id_number = documentId;
    }

    if (section === "personal") {
      return {
        ...basicProfilePayload,
        ...personalInformationPayload,
      };
    }

    return {
      ...basicProfilePayload,
      ...personalInformationPayload,
    };
  };

  const handleSubmit = async (section: ProfileFormSection = "personal") => {
    if (!token || !profileData) {
      toast.error("Please log in to update your profile");
      return;
    }

    try {
      const errors = validateProfileSection(section);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        
        // Create a detailed error message with the first few errors
        const errorFields = Object.entries(errors).slice(0, 3);
        const errorMessage = errorFields.length === 1 
          ? errorFields[0][1]
          : `Please fix these fields: ${errorFields.map(([_, msg]) => msg).join(", ")}`;
        
        toast.error(errorMessage);
        return;
      }

      setSaving(true);
      const updateData = buildProfileUpdatePayload(section);

      if (!updateData) {
        toast.error("No profile data available to update");
        return;
      }

      const response = await authApi.updateProfile(updateData, token);

      if (response.success && response.data) {
        const normalizedProfile = normalizeProfileResponse(response.data);
        setValidationErrors({});
        setProfileData(normalizedProfile);
        setIs2FAEnabled(Boolean(normalizedProfile.user.google_2FA_status));
        if (section === "personal") {
          setIsPersonalEditing(false);
          setPersonalEditSnapshot(null);
        }
        if (section === "bank") {
          setIsBankEditing(false);
          setBankEditSnapshot(null);
        }
        toast.success(
          response.message || "Profile updated successfully"
        );
        window.dispatchEvent(new CustomEvent("profile-updated"));
      } else {
        toast.error(
          response.message || "Failed to update profile"
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes for personal information
  const handlePersonalInfoChange = (field: keyof ProfileViewResponse["personal_information"], value: string | null) => {
    if (!profileData) return;
    clearValidationError(field as ProfileFormField);
    setProfileData({
      ...profileData,
      personal_information: {
        ...profileData.personal_information,
        [field]: value,
      },
    });
  };

  const handleUserInfoChange = (
    field: keyof ProfileViewResponse["user"],
    value: string | number | boolean | null
  ) => {
    if (!profileData) return;
    clearValidationError(field as ProfileFormField);
    setProfileData({
      ...profileData,
      user: {
        ...profileData.user,
        [field]: value,
      },
    });
  };

  const getFieldError = (field: ProfileFormField) => validationErrors[field];

  // Format date for input field
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Format date for display (e.g., "June 01, 2025")
  const formatDateDisplay = (date: Date | undefined): string => {
    if (!date) return "";
    try {
      return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Check if date is valid
  const isValidDate = (date: Date | undefined): boolean => {
    if (!date) return false;
    return !isNaN(date.getTime());
  };

  const setDobStateFromValue = (dob: string | null | undefined) => {
    if (dob) {
      try {
        const nextDobDate = new Date(dob);
        if (isValidDate(nextDobDate)) {
          setDobDate(nextDobDate);
          setDobMonth(nextDobDate);
          setDobValue(formatDateDisplay(nextDobDate));
          return;
        }
      } catch (error) {
        console.error("Error parsing DOB:", error);
      }
    }

    setDobDate(undefined);
    setDobMonth(undefined);
    setDobValue("");
  };

  const handleStartPersonalEditing = () => {
    if (!profileData) return;

    setPersonalEditSnapshot({
      user: {
        first_name: profileData.user.first_name,
        last_name: profileData.user.last_name,
        mobile: profileData.user.mobile,
        country_code: profileData.user.country_code,
      },
      personal_information: { ...profileData.personal_information },
    });
    setValidationErrors({});
    setIsPersonalEditing(true);
  };

  const handleCancelPersonalEditing = () => {
    if (personalEditSnapshot) {
      setProfileData((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                ...personalEditSnapshot.user,
              },
              personal_information: {
                ...personalEditSnapshot.personal_information,
              },
            }
          : current
      );
      setDobStateFromValue(personalEditSnapshot.personal_information.dob);
      setLocationHydrated(false);
    }

    setValidationErrors({});
    setCalendarOpen(false);
    setIsPersonalEditing(false);
    setPersonalEditSnapshot(null);
  };

  const handleCancelBankEditing = () => {
    if (bankEditSnapshot) {
      setBankDetails(bankEditSnapshot);
      setLocationHydrated(false);
    }

    setBankValidationErrors({});
    setIsBankEditing(false);
    setBankEditSnapshot(null);
    setPassbookPhotoFile(null);
  };

  // Get verification status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="border-amber-500/35 bg-amber-500/10 text-amber-300">
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="border-red-800/60 bg-red-950/40 text-red-300">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-white/90">
            {status}
          </Badge>
        );
    }
  };

  // Pagination for login history
  const totalPages = profileData?.login_history
    ? Math.ceil(profileData.login_history.length / itemsPerPage)
    : 0;
  const paginatedHistory = profileData?.login_history
    ? profileData.login_history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  if (loading) {
    return <ProfileContentSkeleton />;
  }

  if (!profileData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  const verificationStatus = profileData.verification_status;
  const overallStatus = profileData.user.verification_status?.toLowerCase() || "";

  // Determine verification badge based on status
  const getVerificationBadge = () => {
    if (overallStatus === "full-verified" || overallStatus === "approved") {
      return (
        <Badge className="border-green-800/60 bg-green-950/40 text-green-300">
          Verified
        </Badge>
      );
    }
    if (overallStatus === "semi-verified") {
      return (
        <Badge className="border-blue-800/60 bg-blue-950/40 text-blue-300">
          Semi Verified
        </Badge>
      );
    }
    if (overallStatus === "pending" || overallStatus === "rejected") {
      return (
        <Badge variant="destructive" className="ml-2">
          {overallStatus === "rejected" ? "Rejected" : "Not Verified"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-white/90">Pending</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Status Section */}
      <PremiumDarkCard innerClassName="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute -right-12 -top-14 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-10 h-40 w-40 rounded-full bg-primary/6 blur-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4 sm:pb-5">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg tracking-tight text-white">
              <span className="whitespace-nowrap">Your Profile Status:</span>
              {getVerificationBadge()}
            </CardTitle>
          </div>
        </div>
        <div className="pt-5 sm:pt-6">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Personal Information Status */}
            <Card className={`relative overflow-hidden rounded-2xl border shadow-sm ${
              verificationStatus.personal_information.status === "completed"
                ? "border-emerald-500/35 bg-black/20 shadow-emerald-950/5"
                : "border-amber-500/40 bg-black/20 shadow-amber-950/5"
            }`}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className={`shrink-0 rounded-xl border p-2 sm:p-2.5 shadow-sm ${
                    verificationStatus.personal_information.status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-amber-500/35 bg-amber-500/10"
                  }`}>
                    <Scale className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      verificationStatus.personal_information.status === "completed"
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 text-xs sm:text-sm font-semibold break-words text-white">Personal Information</h4>
                    <p className="text-[11px] sm:text-xs text-white/70 break-words line-clamp-2">
                      {verificationStatus.personal_information.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.personal_information.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Verification Status */}
            <Card className={`relative overflow-hidden rounded-2xl border shadow-sm ${
              verificationStatus.documents_verification.status === "completed"
                ? "border-emerald-500/35 bg-black/20 shadow-emerald-950/5"
                : "border-amber-500/40 bg-black/20 shadow-amber-950/5"
            }`}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className={`shrink-0 rounded-xl border p-2 sm:p-2.5 shadow-sm ${
                    verificationStatus.documents_verification.status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-amber-500/35 bg-amber-500/10"
                  }`}>
                    <FileText className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      verificationStatus.documents_verification.status === "completed"
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="mb-1 text-xs sm:text-sm font-semibold break-words text-white">Documents Verification</h4>
                    <p className="text-[11px] sm:text-xs text-white/70 break-words line-clamp-2">
                      {verificationStatus.documents_verification.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.documents_verification.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PremiumDarkCard>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="ib-portal-surface inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl border p-1.5">
          <TabsTrigger 
            value="personal" 
            className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
          >
            <User className="h-4 w-4 mr-2" />
            Personal Information
          </TabsTrigger>
          <TabsTrigger 
            value="activity" 
            className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
          >
            <Activity className="h-4 w-4 mr-2" />
            Account Activity
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="bank" 
            className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Bank Details
          </TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <fieldset
            disabled={!isPersonalEditing || saving}
            className={`space-y-6 ${!isPersonalEditing ? "opacity-80" : ""}`}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Basic Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Personal Information</CardTitle>
                  <CardDescription>Update your name, contact details, and identification information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={profileData.user.first_name || ""}
                          onChange={(e) => handleUserInfoChange("first_name", sanitizePersonText(e.target.value))}
                          className={getFieldError("first_name") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter first name"
                        />
                        {getFieldError("first_name") ? (
                          <p className="text-sm text-destructive">{getFieldError("first_name")}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={profileData.user.last_name || ""}
                          onChange={(e) => handleUserInfoChange("last_name", sanitizePersonText(e.target.value))}
                          className={getFieldError("last_name") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter last name"
                        />
                        {getFieldError("last_name") ? (
                          <p className="text-sm text-destructive">{getFieldError("last_name")}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <Label htmlFor="country_code">Country Code</Label>
                        <Input
                          id="country_code"
                          value={normalizeCountryCodeForInput(profileData.user.country_code)}
                          onChange={(e) => handleUserInfoChange("country_code", sanitizeCountryCodeInput(e.target.value))}
                          className={getFieldError("country_code") ? "w-full border-destructive" : "w-full"}
                          placeholder="+91"
                          inputMode="numeric"
                        />
                        {getFieldError("country_code") ? (
                          <p className="text-sm text-destructive">{getFieldError("country_code")}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number</Label>
                        <Input
                          id="mobile"
                          value={profileData.user.mobile || ""}
                          onChange={(e) => handleUserInfoChange("mobile", sanitizeDigits(e.target.value, 10))}
                          className={getFieldError("mobile") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter mobile number"
                          inputMode="numeric"
                          maxLength={10}
                        />
                        {getFieldError("mobile") ? (
                          <p className="text-sm text-destructive">{getFieldError("mobile")}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob" className="px-1">Date of Birth</Label>
                      <div className="relative flex gap-2">
                        <Input
                          id="dob"
                          value={dobValue}
                          placeholder="June 01, 2025"
                          className={getFieldError("dob") ? "bg-background pr-10 border-destructive" : "bg-background pr-10"}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setDobValue(inputValue);
                            const date = new Date(inputValue);
                            if (isValidDate(date)) {
                              setDobDate(date);
                              setDobMonth(date);
                              handlePersonalInfoChange("dob", date.toISOString().split("T")[0]);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setCalendarOpen(true);
                            }
                          }}
                        />
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="date-picker"
                              variant="ghost"
                              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                            >
                              <CalendarIcon className="size-3.5" />
                              <span className="sr-only">Select date</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="end"
                            alignOffset={-8}
                            sideOffset={10}
                          >
                            <Calendar
                              mode="single"
                              selected={dobDate}
                              captionLayout="dropdown"
                              month={dobMonth}
                              onMonthChange={setDobMonth}
                              onSelect={(date) => {
                                setDobDate(date);
                                if (date) {
                                  setDobValue(formatDateDisplay(date));
                                  handlePersonalInfoChange("dob", date.toISOString().split("T")[0]);
                                } else {
                                  setDobValue("");
                                  handlePersonalInfoChange("dob", null);
                                }
                                setCalendarOpen(false);
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {getFieldError("dob") ? (
                        <p className="text-sm text-destructive">{getFieldError("dob")}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Select
                        value={profileData.personal_information.nationality || ""}
                        onValueChange={(value) => handlePersonalInfoChange("nationality", value || null)}
                      >
                        <SelectTrigger
                          id="nationality"
                          className={getFieldError("nationality") ? "w-full border-destructive" : "w-full"}
                        >
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          {FALLBACK_COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.iso2} value={country.iso2}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getFieldError("nationality") ? (
                        <p className="text-sm text-destructive">{getFieldError("nationality")}</p>
                      ) : null}
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="document_type">Document Type</Label>
                      <Select
                        value={selectedDocumentType}
                        onValueChange={(value) => {
                          setSelectedDocumentType(value);
                          // Clear the passport_id_number field when changing document type
                          handlePersonalInfoChange("passport_id_number", null);
                        }}
                      >
                        <SelectTrigger
                          id="document_type"
                          className="w-full"
                        >
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aadhaar_card">Aadhaar Card</SelectItem>
                          <SelectItem value="driving_licence">Driving Licence</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="pan_card">PAN Card</SelectItem>
                          <SelectItem value="voter_id">Voter ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDocumentType && (
                      <div className="space-y-2">
                        <Label htmlFor="document_number">Document ID</Label>
                        <Input
                          id="document_number"
                          value={profileData.personal_information.passport_id_number || ""}
                          onChange={(e) => {
                            const value = sanitizeIdentifierInput(e.target.value, 24) || null;
                            // Store document ID in passport_id_number field
                            // Will be sent to both passport_id_number and other_id_number in payload
                            handlePersonalInfoChange("passport_id_number", value);
                          }}
                          className={getFieldError("passport_id_number") ? "w-full border-destructive" : "w-full"}
                          placeholder={`Enter ${
                            selectedDocumentType === "aadhaar_card" ? "Aadhaar card" :
                            selectedDocumentType === "driving_licence" ? "driving licence" :
                            selectedDocumentType === "passport" ? "passport" :
                            selectedDocumentType === "pan_card" ? "PAN card" :
                            "voter ID"
                          } number`}
                        />
                        {getFieldError("passport_id_number") && (
                          <p className="text-sm text-destructive">{getFieldError("passport_id_number")}</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="pin_code">PIN Code</Label>
                      <Input
                        id="pin_code"
                        value={profileData.personal_information.pin_code || ""}
                        onChange={(e) => handlePersonalInfoChange("pin_code", sanitizeIdentifierInput(e.target.value, 12) || null)}
                        className={getFieldError("pin_code") ? "w-full border-destructive" : "w-full"}
                        placeholder="Enter PIN code"
                      />
                      {getFieldError("pin_code") ? (
                        <p className="text-sm text-destructive">{getFieldError("pin_code")}</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location and Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Location and Status Information</CardTitle>
                  <CardDescription>Update your employment status, client type, and location details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="employment_status">Employment Status</Label>
                      <Select
                        value={profileData.personal_information.employment_status || ""}
                        onValueChange={(value) => handlePersonalInfoChange("employment_status", value || null)}
                      >
                        <SelectTrigger id="employment_status" className={getFieldError("employment_status") ? "w-full border-destructive" : "w-full"}>
                          <SelectValue placeholder="Select employment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employed">Employed</SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                          <SelectItem value="self-employed">Self-Employed</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("employment_status") ? (
                        <p className="text-sm text-destructive">{getFieldError("employment_status")}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client_type">Client Type</Label>
                      <Select
                        value={profileData.personal_information.client_type || ""}
                        onValueChange={(value) => handlePersonalInfoChange("client_type", value || null)}
                      >
                        <SelectTrigger id="client_type" className={getFieldError("client_type") ? "w-full border-destructive" : "w-full"}>
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError("client_type") ? (
                        <p className="text-sm text-destructive">{getFieldError("client_type")}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={
                          countryMode === "other"
                            ? LOCATION_OTHER_VALUE
                            : selectedCountryId
                              ? String(selectedCountryId)
                              : ""
                        }
                        onValueChange={(value) => {
                          void handleCountrySelection(value);
                        }}
                      >
                        <SelectTrigger id="country" className={getFieldError("country") ? "w-full border-destructive" : "w-full"}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((country) => (
                            <SelectItem key={country.id} value={String(country.id)}>
                              {country.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={LOCATION_OTHER_VALUE}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {countryMode === "other" ? (
                        <Input
                          value={profileData.personal_information.country || ""}
                          onChange={(e) =>
                            handlePersonalInfoChange("country", sanitizePersonText(e.target.value) || null)
                          }
                          className={getFieldError("country") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter country manually"
                        />
                      ) : null}
                      {getFieldError("country") ? (
                        <p className="text-sm text-destructive">{getFieldError("country")}</p>
                      ) : countryMode === "other" ? (
                        <p className="text-sm text-muted-foreground">Use a custom country when it is not listed.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      {countryMode === "other" || stateMode === "other" ? (
                        <Input
                          id="state"
                          value={profileData.personal_information.state || ""}
                          onChange={(e) =>
                            handlePersonalInfoChange("state", sanitizePersonText(e.target.value) || null)
                          }
                          className={getFieldError("state") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter state manually"
                        />
                      ) : (
                        <Select
                          value={selectedStateId ? String(selectedStateId) : ""}
                          onValueChange={(value) => {
                            void handleStateSelection(value);
                          }}
                          disabled={!selectedCountryId}
                        >
                          <SelectTrigger id="state" className={getFieldError("state") ? "w-full border-destructive" : "w-full"}>
                            <SelectValue placeholder={selectedCountryId ? "Select state" : "Select country first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {stateOptions.map((state) => (
                              <SelectItem key={state.id} value={String(state.id)}>
                                {state.name}
                              </SelectItem>
                            ))}
                            <SelectItem value={LOCATION_OTHER_VALUE}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {getFieldError("state") ? (
                        <p className="text-sm text-destructive">{getFieldError("state")}</p>
                      ) : countryMode === "other" || stateMode === "other" ? (
                        <p className="text-sm text-muted-foreground">Use a custom state when it is not listed.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      {countryMode === "other" || stateMode === "other" || cityMode === "other" ? (
                        <Input
                          id="city"
                          value={profileData.personal_information.city || ""}
                          onChange={(e) =>
                            handlePersonalInfoChange("city", sanitizePersonText(e.target.value) || null)
                          }
                          className={getFieldError("city") ? "w-full border-destructive" : "w-full"}
                          placeholder="Enter city manually"
                        />
                      ) : (
                        <Select
                          value={selectedCityId ? String(selectedCityId) : ""}
                          onValueChange={handleCitySelection}
                          disabled={!selectedCountryId || !selectedStateId}
                        >
                          <SelectTrigger id="city" className={getFieldError("city") ? "w-full border-destructive" : "w-full"}>
                            <SelectValue placeholder={selectedStateId ? "Select city" : "Select state first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cityOptions.map((city) => (
                              <SelectItem key={city.id} value={String(city.id)}>
                                {city.name}
                              </SelectItem>
                            ))}
                            <SelectItem value={LOCATION_OTHER_VALUE}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {getFieldError("city") ? (
                        <p className="text-sm text-destructive">{getFieldError("city")}</p>
                      ) : countryMode === "other" || stateMode === "other" || cityMode === "other" ? (
                        <p className="text-sm text-muted-foreground">Use a custom city when it is not listed.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter your full address..."
                        value={profileData.personal_information.address || ""}
                        onChange={(e) => handlePersonalInfoChange("address", e.target.value || null)}
                        rows={3}
                        className={getFieldError("address") ? "w-full border-destructive" : "w-full"}
                      />
                      {getFieldError("address") ? (
                        <p className="text-sm text-destructive">{getFieldError("address")}</p>
                      ) : null}
                    </div>
                  </div>
                  
                </CardContent>
              </Card>
            </div>
          </fieldset>
          <div className="flex justify-end gap-3">
            {isPersonalEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelPersonalEditing}
                disabled={saving}
                size="lg"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => {
                if (!isPersonalEditing) {
                  handleStartPersonalEditing();
                  return;
                }
                void handleSubmit("personal");
              }}
              disabled={saving}
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isPersonalEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <ProfileActivityTab
          loginHistory={profileData.login_history ?? []}
          paginatedHistory={paginatedHistory}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onSetCurrentPage={setCurrentPage}
        />
        <ProfileSecurityTab
          isLoading2FAStatus={isLoading2FAStatus}
          is2FAEnabled={Boolean(is2FAEnabled || profileData?.user?.google_2FA_status)}
          onOpenTwoFactorModal={() => setTwoFactorModalOpen(true)}
        />
        <ProfileBankDetailsTab
          bankDetails={bankDetails}
          bankDetailsList={bankDetailsList}
          bankValidationErrors={bankValidationErrors}
          bankCountryMode={bankCountryMode}
          selectedBankCountryId={selectedBankCountryId}
          countryOptions={countryOptions}
          bankDetailsSaving={bankDetailsSaving}
          bankDetailsRecordId={bankDetailsRecordId}
          bankDetailsDeletingId={bankDetailsDeletingId}
          isBankEditing={isBankEditing}
          onBankCountrySelection={handleBankCountrySelection}
          onUpdateBankDetails={updateBankDetails}
          onPassbookPhotoFileChange={(file) => {
            setPassbookPhotoFile(file);
            if (file) {
              updateBankDetails("bookBankFileName", file.name);
            }
          }}
          passbookPhotoFileName={passbookPhotoFile?.name ?? null}
          passbookPhotoFile={passbookPhotoFile}
          onSubmitBankDetails={() => {
            void handleBankDetailsSubmit();
          }}
          onCancelBankEditing={handleCancelBankEditing}
          onStartAddBankDetails={handleStartAddBankDetails}
          onStartEditBankDetails={handleStartEditBankDetails}
          onRequestDeleteBankDetails={handleRequestDeleteBankDetails}
          onConfirmDeleteBankDetails={handleConfirmDeleteBankDetails}
          onCancelDeleteBankDetails={handleCancelDeleteBankDetails}
          pendingDeleteBankId={pendingDeleteBankId}
          sanitizePersonText={sanitizePersonText}
          sanitizeIdentifierInput={sanitizeIdentifierInput}
        />
      </Tabs>

      <TwoFactorModal 
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        is2FAEnabled={Boolean(is2FAEnabled || profileData?.user?.google_2FA_status)}
        onStatusChange={handle2FAStatusChange}
      />
    </div>
  );
}
