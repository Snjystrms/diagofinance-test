export const CLIENT_WALLET_REFRESH_EVENT = "client:wallet-refresh";

export const notifyWalletRefresh = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CLIENT_WALLET_REFRESH_EVENT));
};
