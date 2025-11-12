export const normalizeManagerPermissionName = (name: string): string =>
  (name || "").toString().trim().toLowerCase();

type ModuleFeatureMap = Record<string, string[]>;

export const managerPermissionConfig: Record<string, ModuleFeatureMap> = {
  bonus: {
    bonusList: ["Bonus List"],
    giveBonus: ["Give Bonus"],
    removeBonus: ["Remove Bonus"],
  },
  emailManagement: {
    sendEmail: ["Send Email"],
  },
  groupManagement: {
    addGroup: ["Add Group"],
    editGroup: ["Edit Group"],
    groupList: ["Group List"],
    updateMt5Group: ["Update MT5 Group"],
  },
  ibManagement: {
    addCommissionGroup: ["Add Commission Group"],
    addIbCommission: ["Add IB Commission"],
    addIbPlan: ["Add IB Plan"],
    commissionGroup: ["Commission Group"],
    editCommissionGroup: ["Edit Commission Group"],
    editIbCommission: ["Edit IB Commission"],
    ibPlan: ["IB Plan"],
    ibRequests: ["IB Requests"],
    ibUsers: ["IB Users"],
    moveClientToIb: ["Move Client to IB"],
    setIbCommission: ["Set IB Commission"],
    viewCommission: ["View Commission"],
    viewLevel: ["View Level"],
  },
  marketingManagement: {
    addMarketing: ["Add Marketing"],
    deleteMarketing: ["Delete Marketing"],
    editMarketing: ["Edit Marketing"],
    incentiveReport: ["Incentive Report"],
    marketingList: ["Marketing List"],
  },
  newsManagement: {
    addNews: ["Add News"],
    deleteNews: ["Delete News"],
    editNews: ["Edit News"],
    newsList: ["News List"],
  },
  notification: {
    readNotification: ["Read Notification"],
    unreadNotification: ["Unread Notification"],
  },
  reportManagement: {
    depositReport: ["Deposit Report"],
    historyReport: ["History Report"],
    ibWithdrawReport: ["IB Withdraw Report"],
    internalTransferReport: ["Internal Transfer Report"],
    loginActivity: ["Login Activity"],
    lotReport: ["Lot Report"],
    positionReport: ["Position Report"],
    walletHistoryReport: ["Wallet History Report"],
    withdrawReport: ["Withdraw Report"],
  },
  rewardsManagement: {
    addRewards: ["Add Rewards"],
    rewardsList: ["Rewards List"],
  },
  settingsManagement: {
    defaultSetting: ["Default Setting"],
    depositBankDetails: ["Deposit Bank Details"],
    promotionList: ["Promotion List"],
    pspSetting: ["PSP Setting"],
  },
  subAdmin: {
    addPermission: ["Add Permission"],
    createSubAdmin: ["Create Sub Admin"],
    editPermission: ["Edit Permission"],
    subAdminList: ["Sub Admin List"],
  },
  ticketManagement: {
    tickets: ["Tickets"],
  },
  transaction: {
    approveDepositList: ["Approve Deposit List"],
    approveRejectDeposit: ["Approve/Reject Deposit"],
    clientDeposit: ["Client Deposit"],
    clientWithdraw: ["Client Withdraw"],
    ibWithdraw: ["IB Withdraw"],
    internalTransfer: ["Internal Transfer"],
    pendingDepositList: ["Pending Deposit List"],
    pendingIbWithdraw: ["Pending IB Withdraw"],
    pendingWithdraw: ["Pending Withdraw"],
    rejectDepositList: ["Reject Deposit List"],
    walletDeposit: ["Wallet Deposit"],
    walletWithdraw: ["Wallet Withdraw"],
  },
  userManagement: {
    addBankDetails: ["Add Bank Details"],
    addExistingClient: ["Add Existing Client"],
    addUser: ["Add User"],
    approveDocumentsList: ["Approve Documents List"],
    approveRejectKyc: ["Approve/Reject KYC"],
    bankDetailsList: ["Bank Details List"],
    changeMt5Password: ["Change MT5 Password"],
    changeUserPassword: ["Change User Password"],
    createMt5Account: ["Create MT5 Account"],
    deleteUser: ["Delete User"],
    editUser: ["Edit User"],
    followUpList: ["Follow Up List"],
    mt5UserList: ["MT5 User List"],
    pendingDocumentsList: ["Pending Documents List"],
    rejectDocumentList: ["Reject Document List"],
    resendMt5DataMail: ["Resend MT5 Data Mail"],
    resendVerificationMail: ["Resend Verification Mail"],
    resetGoogle2fa: ["Reset Google 2FA"],
    updateMt5Leverage: ["Update MT5 Leverage"],
    uploadUserDocuments: ["Upload User Documents"],
    userList: ["User List"],
    userPasswordList: ["User Password List"],
    userSetting: ["User Setting"],
    viewUser: ["View User"],
  },
  bonusManagement: {
    // alias for compatibility if needed
    bonusList: ["Bonus List"],
    giveBonus: ["Give Bonus"],
    removeBonus: ["Remove Bonus"],
  },
};

export type ManagerPermissionModule = keyof typeof managerPermissionConfig;

export const getManagerPermissionNames = (
  moduleKey: ManagerPermissionModule,
  featureKey: string
): string[] => {
  const moduleConfig = managerPermissionConfig[moduleKey];
  if (!moduleConfig) return [];
  const entry = moduleConfig[featureKey];
  if (!entry) return [];
  return entry.map(normalizeManagerPermissionName);
};

