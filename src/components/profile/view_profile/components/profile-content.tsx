"use client";

import { Scale, Settings, FileText, Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
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

type ProfileFormSection = "personal" | "legal";

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

type LocationCountryOption = {
  id: number;
  name: string;
  iso2: string;
  phone_code: string;
  hasStates: boolean;
};

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileViewResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dobDate, setDobDate] = useState<Date | undefined>(undefined);
  const [dobMonth, setDobMonth] = useState<Date | undefined>(undefined);
  const [dobValue, setDobValue] = useState("");
  const [validationErrors, setValidationErrors] = useState<Partial<Record<ProfileFormField, string>>>({});
  const [financialCurrency, setFinancialCurrency] = useState("USD");
  const [countryOptions, setCountryOptions] = useState<LocationCountryOption[]>([]);
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
  const [bankDetailsSaving, setBankDetailsSaving] = useState(false);
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
  };

  const applyBankDetailsToForm = (details: UserBankDetailsData) => {
    setBankDetailsRecordId(details.id);
    setBankDetails((current) => ({
      ...current,
      accountName: details.account_holder_name ?? "",
      accountNumber: details.account_number ?? "",
      ifscSwiftCode: details.swift_ifsc_code ?? "",
      ibanNumber: details.iban_number ?? "",
      bankName: details.bank_name ?? "",
      bankAddress: details.address ?? "",
      country: details.country ?? "",
    }));
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
    legal_information: {
      ...data.legal_information,
      politically_exposed: Boolean(data.legal_information.politically_exposed),
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
    const { user: profileUser, personal_information, legal_information } = profileData;

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
      requireText("passport_id_number", personal_information.passport_id_number, "Passport ID number");
      requireText("pin_code", personal_information.pin_code, "PIN code");
      requireText("nationality", personal_information.nationality, "Nationality");
      requireText("employment_status", personal_information.employment_status, "Employment status");
      requireText("tax_number", personal_information.tax_number, "Tax number");
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
        errors.mobile = "Mobile number must contain 8 to 15 digits.";
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

    if (section === "legal") {
      requireText("source_of_income", legal_information.source_of_income, "Source of income");
      requireText("purpose_of_opening_account", legal_information.purpose_of_opening_account, "Purpose of opening account");

      if (legal_information.annual_income === null || Number(legal_information.annual_income) <= 0) {
        errors.annual_income = "Annual income must be greater than 0.";
      }

      if (legal_information.estimated_net_worth === null || Number(legal_information.estimated_net_worth) <= 0) {
        errors.estimated_net_worth = "Estimated net worth must be greater than 0.";
      }

      if (legal_information.estimated_annual_amount === null || Number(legal_information.estimated_annual_amount) <= 0) {
        errors.estimated_annual_amount = "Estimated annual amount must be greater than 0.";
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

  const handleBankDetailsSubmit = async () => {
    if (!token) {
      toast.error("Authentication required");
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
    };

    if (
      !payload.account_holder_name ||
      !payload.account_number ||
      !payload.swift_ifsc_code ||
      !payload.bank_name ||
      !payload.address ||
      !payload.country
    ) {
      toast.error("Please fill all required bank details fields.");
      return;
    }

    try {
      setBankDetailsSaving(true);
      const response = bankDetailsRecordId
        ? await authApi.updateBankDetails(payload, token)
        : await authApi.createBankDetails(payload, token);

      if (response.data) {
        applyBankDetailsToForm(response.data);
      }

      toast.success(
        response.message ||
          (bankDetailsRecordId
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCurrency = window.localStorage.getItem("profile-financial-currency");
    if (storedCurrency) {
      setFinancialCurrency(storedCurrency);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("profile-financial-currency", financialCurrency);
  }, [financialCurrency]);

  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      try {
        const countries = ((await GetCountries()) as LocationCountryOption[]).slice().sort((left, right) =>
          left.name.localeCompare(right.name)
        );

        if (!cancelled) {
          setCountryOptions(countries);
        }
      } catch (error) {
        console.error("Error loading countries:", error);
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
          applyBankDetailsToForm(bankResponse.data);
        } else {
          setBankDetailsRecordId(null);
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
      const isManager = user.type === 'manager';
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

    const { user: profileUser, personal_information, legal_information } = profileData;
    const basicProfilePayload: UserProfileUpdatePayload = {
      first_name: profileUser.first_name || "",
      last_name: profileUser.last_name || "",
      mobile: profileUser.mobile || "",
      country_code: normalizeCountryCodeForInput(profileUser.country_code),
    };

    const personalInformationPayload: UserProfileUpdatePayload = {
      dob: formatDateForInput(personal_information.dob),
      address: personal_information.address || "",
      passport_id_number: personal_information.passport_id_number || "",
      pin_code: personal_information.pin_code || "",
      nationality: personal_information.nationality || "",
      employment_status: personal_information.employment_status || "",
      tax_number: personal_information.tax_number || "",
      client_type: personal_information.client_type || "",
      country: personal_information.country || "",
      state: personal_information.state || "",
      city: personal_information.city || "",
    };

    if (personal_information.other_id_number?.trim()) {
      personalInformationPayload.other_id_number = personal_information.other_id_number.trim();
    }

    const legalInformationPayload: UserProfileUpdatePayload = {
      politically_exposed: Boolean(legal_information.politically_exposed),
      annual_income: Number(legal_information.annual_income ?? 0),
      source_of_income: legal_information.source_of_income || "",
      estimated_net_worth: Number(legal_information.estimated_net_worth ?? 0),
      purpose_of_opening_account: legal_information.purpose_of_opening_account || "",
      estimated_annual_amount: Number(legal_information.estimated_annual_amount ?? 0),
    };

    if (section === "personal") {
      return {
        ...basicProfilePayload,
        ...personalInformationPayload,
      };
    }

    if (section === "legal") {
      return legalInformationPayload;
    }

    return {
      ...basicProfilePayload,
      ...personalInformationPayload,
      ...legalInformationPayload,
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
        toast.error("Please fix the highlighted fields before saving.");
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
        toast.success(
          response.message ||
            (section === "legal"
              ? "Legal information updated successfully"
              : "Profile updated successfully")
        );
        window.dispatchEvent(new CustomEvent("profile-updated"));
      } else {
        toast.error(
          response.message ||
            (section === "legal"
              ? "Failed to update legal information"
              : "Failed to update profile")
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : section === "legal"
            ? "Failed to update legal information"
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

  // Handle input changes for legal information
  const handleLegalInfoChange = (field: keyof ProfileViewResponse["legal_information"], value: string | number | boolean | null) => {
    if (!profileData) return;
    clearValidationError(field as ProfileFormField);
    setProfileData({
      ...profileData,
      legal_information: {
        ...profileData.legal_information,
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

  // Get verification status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800">
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
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
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800">
          Verified
        </Badge>
      );
    }
    if (overallStatus === "semi-verified") {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
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
      <Badge variant="outline">Pending</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Status Section */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Your Profile Status:
                {getVerificationBadge()}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Personal Information Status */}
            <Card className={`border-2 ${
              verificationStatus.personal_information.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.personal_information.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <Scale className={`h-5 w-5 ${
                      verificationStatus.personal_information.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Personal Information</h4>
                    <p className="text-xs text-muted-foreground">
                      {verificationStatus.personal_information.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.personal_information.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Information Status */}
            <Card className={`border-2 ${
              verificationStatus.legal_information.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.legal_information.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <Settings className={`h-5 w-5 ${
                      verificationStatus.legal_information.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Legal Information</h4>
                    <p className="text-xs text-muted-foreground">
                      {verificationStatus.legal_information.message}
                    </p>
                    <div className="mt-2">
                      {getStatusBadge(verificationStatus.legal_information.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Verification Status */}
            <Card className={`border-2 ${
              verificationStatus.documents_verification.status === "completed"
                ? "border-green-200 dark:border-green-800"
                : "border-orange-200 dark:border-orange-800"
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    verificationStatus.documents_verification.status === "completed"
                      ? "bg-green-100 dark:bg-green-950/40"
                      : "bg-orange-100 dark:bg-orange-950/40"
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      verificationStatus.documents_verification.status === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Documents Verification</h4>
                    <p className="text-xs text-muted-foreground">
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
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="account">Legal Information</TabsTrigger>
          <TabsTrigger value="activity">Account Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
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
                        onChange={(e) => handleUserInfoChange("mobile", sanitizeDigits(e.target.value, 15))}
                        className={getFieldError("mobile") ? "w-full border-destructive" : "w-full"}
                        placeholder="Enter mobile number"
                        inputMode="numeric"
                        maxLength={15}
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
                    <Input
                      id="nationality"
                      value={profileData.personal_information.nationality || ""}
                      onChange={(e) => handlePersonalInfoChange("nationality", sanitizeUppercase(e.target.value, 3) || null)}
                      className={getFieldError("nationality") ? "w-full border-destructive" : "w-full"}
                      placeholder="e.g. IN"
                    />
                    {getFieldError("nationality") ? (
                      <p className="text-sm text-destructive">{getFieldError("nationality")}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_id_number">Passport ID Number</Label>
                    <Input
                      id="passport_id_number"
                      value={profileData.personal_information.passport_id_number || ""}
                      onChange={(e) => handlePersonalInfoChange("passport_id_number", sanitizeIdentifierInput(e.target.value, 20) || null)}
                      className={getFieldError("passport_id_number") ? "w-full border-destructive" : "w-full"}
                      placeholder="Enter passport ID number"
                    />
                    {getFieldError("passport_id_number") ? (
                      <p className="text-sm text-destructive">{getFieldError("passport_id_number")}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_number">Tax Number</Label>
                    <Input
                      id="tax_number"
                      value={profileData.personal_information.tax_number || ""}
                      onChange={(e) => handlePersonalInfoChange("tax_number", sanitizeIdentifierInput(e.target.value, 20) || null)}
                      className={getFieldError("tax_number") ? "w-full border-destructive" : "w-full"}
                      placeholder="Enter tax number"
                    />
                    {getFieldError("tax_number") ? (
                      <p className="text-sm text-destructive">{getFieldError("tax_number")}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="other_id_number">Other ID Number</Label>
                      <Input
                        id="other_id_number"
                        value={profileData.personal_information.other_id_number || ""}
                        onChange={(e) => handlePersonalInfoChange("other_id_number", sanitizeIdentifierInput(e.target.value, 24) || null)}
                        className="w-full"
                        placeholder="Enter other ID number"
                      />
                  </div>
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
          <div className="flex justify-end">
                  <Button 
                onClick={() => handleSubmit("personal")} 
                disabled={saving}
                size="lg"
              >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Legal Information */}
        <TabsContent value="account" className="space-y-6">
          <Card className="mx-auto w-full max-w-5xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Legal Information</CardTitle>
              <CardDescription>Provide your legal and financial information for account verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="politically_exposed" className="text-sm font-semibold">Politically Exposed Person</Label>
                      <p className="text-sm text-muted-foreground">
                        Tell us whether you currently qualify as a politically exposed person.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-background/90 px-4 py-3">
                    <Switch
                      id="politically_exposed"
                      checked={profileData.legal_information.politically_exposed}
                      onCheckedChange={(checked) =>
                        handleLegalInfoChange("politically_exposed", checked)
                      }
                    />
                    <span className="text-sm font-medium text-foreground">
                      {profileData.legal_information.politically_exposed ? "Marked as politically exposed" : "Marked as not politically exposed"}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                  <div className="space-y-2">
                    <Label htmlFor="financial_currency" className="text-sm font-semibold">Financial Currency</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose the currency context for the income and net-worth values below.
                    </p>
                    <Select value={financialCurrency} onValueChange={setFinancialCurrency}>
                      <SelectTrigger id="financial_currency" className="w-full bg-background">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCIAL_CURRENCY_OPTIONS.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {`${currency.value} - ${currency.label}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-border/60 p-4">
                  <Label htmlFor="annual_income">Annual Income</Label>
                  <p className="text-sm text-muted-foreground">
                    Your total annual income in {financialCurrency}.
                  </p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {financialCurrency}
                    </span>
                    <Input
                      id="annual_income"
                      inputMode="decimal"
                      value={profileData.legal_information.annual_income ?? ""}
                      onChange={(e) =>
                        handleLegalInfoChange("annual_income", parseOptionalMoneyValue(e.target.value))
                      }
                      className={getFieldError("annual_income") ? "w-full border-destructive pl-20" : "w-full pl-20"}
                      placeholder={formatMoneyPlaceholder("Annual income")}
                    />
                  </div>
                  {getFieldError("annual_income") ? (
                    <p className="text-sm text-destructive">{getFieldError("annual_income")}</p>
                  ) : null}
                </div>
                <div className="space-y-2 rounded-2xl border border-border/60 p-4">
                  <Label htmlFor="source_of_income">Source of Income</Label>
                  <p className="text-sm text-muted-foreground">
                    Primary source of the income you reported.
                  </p>
                  <Input
                    id="source_of_income"
                    value={profileData.legal_information.source_of_income || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("source_of_income", sanitizePersonText(e.target.value) || null)
                    }
                    className={getFieldError("source_of_income") ? "w-full border-destructive" : "w-full"}
                    placeholder="e.g. Salary"
                  />
                  {getFieldError("source_of_income") ? (
                    <p className="text-sm text-destructive">{getFieldError("source_of_income")}</p>
                  ) : null}
                </div>
                <div className="space-y-2 rounded-2xl border border-border/60 p-4">
                  <Label htmlFor="estimated_net_worth">Estimated Net Worth</Label>
                  <p className="text-sm text-muted-foreground">
                    Approximate total net worth in {financialCurrency}.
                  </p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {financialCurrency}
                    </span>
                    <Input
                      id="estimated_net_worth"
                      inputMode="decimal"
                      value={profileData.legal_information.estimated_net_worth ?? ""}
                      onChange={(e) =>
                        handleLegalInfoChange("estimated_net_worth", parseOptionalMoneyValue(e.target.value))
                      }
                      className={getFieldError("estimated_net_worth") ? "w-full border-destructive pl-20" : "w-full pl-20"}
                      placeholder={formatMoneyPlaceholder("Estimated net worth")}
                    />
                  </div>
                  {getFieldError("estimated_net_worth") ? (
                    <p className="text-sm text-destructive">{getFieldError("estimated_net_worth")}</p>
                  ) : null}
                </div>
                <div className="space-y-2 rounded-2xl border border-border/60 p-4">
                  <Label htmlFor="estimated_annual_amount">Estimated Annual Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    Estimated yearly transaction volume in {financialCurrency}.
                  </p>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {financialCurrency}
                    </span>
                    <Input
                      id="estimated_annual_amount"
                      inputMode="decimal"
                      value={profileData.legal_information.estimated_annual_amount ?? ""}
                      onChange={(e) =>
                        handleLegalInfoChange("estimated_annual_amount", parseOptionalMoneyValue(e.target.value))
                      }
                      className={getFieldError("estimated_annual_amount") ? "w-full border-destructive pl-20" : "w-full pl-20"}
                      placeholder={formatMoneyPlaceholder("Estimated annual amount")}
                    />
                  </div>
                  {getFieldError("estimated_annual_amount") ? (
                    <p className="text-sm text-destructive">{getFieldError("estimated_annual_amount")}</p>
                  ) : null}
                </div>
                <div className="space-y-2 rounded-2xl border border-border/60 p-4 md:col-span-2">
                  <Label htmlFor="purpose_of_opening_account">Purpose of Opening Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Tell us the main reason you want to use this account.
                  </p>
                  <Textarea
                    id="purpose_of_opening_account"
                    value={profileData.legal_information.purpose_of_opening_account || ""}
                    onChange={(e) =>
                      handleLegalInfoChange("purpose_of_opening_account", e.target.value || null)
                    }
                    className={getFieldError("purpose_of_opening_account") ? "min-h-28 w-full resize-none border-destructive" : "min-h-28 w-full resize-none"}
                    placeholder="e.g. Trading and investment"
                    rows={4}
                  />
                  {getFieldError("purpose_of_opening_account") ? (
                    <p className="text-sm text-destructive">{getFieldError("purpose_of_opening_account")}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-border/60 pt-6">
              <Button 
                onClick={() => handleSubmit("legal")}
                disabled={saving}
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Legal Information"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Account Activity Logs */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity Logs</CardTitle>
              <CardDescription>Login History</CardDescription>
            </CardHeader>
            <CardContent>
              {profileData.login_history && profileData.login_history.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Browser</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory.map((log, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{log.date}</TableCell>
                            <TableCell>{log.time}</TableCell>
                            <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                            <TableCell>{log.browser}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, profileData.login_history.length)} of {profileData.login_history.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No login history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-muted-foreground text-sm">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading2FAStatus ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : is2FAEnabled || profileData?.user?.google_2FA_status ? (
                      <>
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800">
                          Enabled
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setTwoFactorModalOpen(true)}
                        >
                          Configure
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">Disabled</Badge>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setTwoFactorModalOpen(true)}
                        >
                          Enable 2FA
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-6">
          <Card className="mx-auto w-full max-w-5xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Add Bank Details</CardTitle>
              <CardDescription>
                Add or update your bank details. Existing values are loaded automatically when available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bank_client">Select Client</Label>
                  <Select
                    value={bankDetails.client}
                    onValueChange={(value) => updateBankDetails("client", value)}
                  >
                    <SelectTrigger id="bank_client" className="w-full">
                      <SelectValue placeholder="Please choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_CLIENT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    value={bankDetails.accountName}
                    onChange={(e) =>
                      updateBankDetails("accountName", sanitizePersonText(e.target.value).slice(0, 80))
                    }
                    placeholder="Enter account holder name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account No.</Label>
                  <Input
                    id="account_number"
                    value={bankDetails.accountNumber}
                    onChange={(e) =>
                      updateBankDetails("accountNumber", sanitizeIdentifierInput(e.target.value, 34))
                    }
                    placeholder="Enter account number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc_swift_code">IFSC / Swift Code</Label>
                  <Input
                    id="ifsc_swift_code"
                    value={bankDetails.ifscSwiftCode}
                    onChange={(e) =>
                      updateBankDetails("ifscSwiftCode", sanitizeIdentifierInput(e.target.value, 20))
                    }
                    placeholder="Enter IFSC / Swift code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban_number">IBAN No.</Label>
                  <Input
                    id="iban_number"
                    value={bankDetails.ibanNumber}
                    onChange={(e) =>
                      updateBankDetails("ibanNumber", sanitizeIdentifierInput(e.target.value, 34))
                    }
                    placeholder="Enter IBAN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={bankDetails.bankName}
                    onChange={(e) =>
                      updateBankDetails("bankName", sanitizePersonText(e.target.value).slice(0, 80))
                    }
                    placeholder="Enter bank name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_address">Bank Address</Label>
                  <Input
                    id="bank_address"
                    value={bankDetails.bankAddress}
                    onChange={(e) => updateBankDetails("bankAddress", e.target.value)}
                    placeholder="Enter bank address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_country">Country</Label>
                  <Select
                    value={
                      bankCountryMode === "other"
                        ? LOCATION_OTHER_VALUE
                        : selectedBankCountryId
                          ? String(selectedBankCountryId)
                          : ""
                    }
                    onValueChange={handleBankCountrySelection}
                  >
                    <SelectTrigger id="bank_country" className="w-full">
                      <SelectValue placeholder="Please choose..." />
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
                  {bankCountryMode === "other" ? (
                    <Input
                      value={bankDetails.country}
                      onChange={(e) =>
                        updateBankDetails("country", sanitizePersonText(e.target.value).slice(0, 80))
                      }
                      placeholder="Enter country manually"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book_bank">Book Bank</Label>
                  <Input
                    id="book_bank"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) =>
                      updateBankDetails("bookBankFileName", e.target.files?.[0]?.name ?? "")
                    }
                  />
                  {bankDetails.bookBankFileName ? (
                    <p className="text-sm text-muted-foreground">{bankDetails.bookBankFileName}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-start">
                <Button type="button" onClick={handleBankDetailsSubmit} disabled={bankDetailsSaving}>
                  {bankDetailsSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    bankDetailsRecordId ? "Update Bank Details" : "Submit"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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
