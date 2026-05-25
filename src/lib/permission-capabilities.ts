import type { ManagerPermissionModule } from "@/lib/manager-permissions";

export type CapabilityDefinition = Record<string, string | string[]>;

export const permissionCapabilities = {
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
} satisfies Partial<Record<ManagerPermissionModule, CapabilityDefinition>>;

export type CapabilityModuleKey = keyof typeof permissionCapabilities;
export type CapabilityKey<M extends CapabilityModuleKey> = keyof (typeof permissionCapabilities)[M];

