import { apiCall, type ApiResponse } from "./api-core";

export interface UserDefaultSettings {
  disable_account: boolean;
  disable_deposit: boolean;
  disable_withdraw: boolean;
  disable_transfer: boolean;
  disable_ib_withdraw: boolean;
  disable_mt5_to_wallet: boolean;
  disable_wallet_to_mt5: boolean;
  disable_ib_commission: boolean;
  updated_by: string | null;
  updated_at: string | null;
}

export const EMPTY_DEFAULT_SETTINGS: UserDefaultSettings = {
  disable_account: false,
  disable_deposit: false,
  disable_withdraw: false,
  disable_transfer: false,
  disable_ib_withdraw: false,
  disable_mt5_to_wallet: false,
  disable_wallet_to_mt5: false,
  disable_ib_commission: false,
  updated_by: null,
  updated_at: null,
};

export const defaultSettingsApi = {
  get: (token: string): Promise<ApiResponse<UserDefaultSettings>> =>
    apiCall<UserDefaultSettings>("/user/default-settings", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};
