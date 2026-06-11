import type { ManagerPermissionModule } from "@/lib/manager-permissions";

export type CapabilityDefinition = Record<string, string | string[]>;

export const permissionCapabilities = {
  newsManagement: {
    list: "newsList",
    add: "addNews",
    edit: "editNews",
    delete: "deleteNews",
  },
  groupManagement: {
    list: "groupList",
    add: "addGroup",
    edit: "editGroup",
    delete: "deleteGroup",
  },
  transaction: {
    viewDeposits: "depositList",
    viewWithdrawals: "withdrawalList",
    approveDeposit: "approveRejectDeposit",
    approveWithdrawal: "approveRejectWithdrawal",
  },
  "account-types": {
    list: "accountTypesList",
    add: "createAccountType",
    edit: "editAccountType",
    delete: "deleteAccountType",
  },
  bonusManagement: {
    list: "bonusList",
    add: "giveBonus",
    delete: "removeBonus",
  },
  userManagement: {
    list: "userList",
    view: "viewUser",
    add: "addUser",
    edit: "editUser",
    delete: "deleteUser",
    mt5List: "mt5UserList",
    mt5Add: "createMt5Account",
    mt5Edit: "updateMt5Leverage",
    mt5Delete: "deleteMt5Account",
    kycReview: "approveRejectKyc",
    kycUpload: "uploadUserDocuments",
  },
  ibManagement: {
    promoteClientToIb: "moveClientToIb",
  },
  cryptoWalletManagement: {
    list: "cryptoWalletList",
    add: "addCryptoWallet",
    edit: "editCryptoWallet",
    delete: "deleteCryptoWallet",
  },
} satisfies Partial<Record<ManagerPermissionModule, CapabilityDefinition>>;

export type CapabilityModuleKey = keyof typeof permissionCapabilities;
export type CapabilityKey<M extends CapabilityModuleKey> = keyof (typeof permissionCapabilities)[M];
