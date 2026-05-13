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
    getClientEmails: ["Get Client Emails"],
    broadcastEmail: ["Broadcast Email"],
    broadcastEmailHistory: ["Broadcast Email History"],
  },
  groupManagement: {
    addGroup: ["Add Group"],
    deleteGroup: ["Delete Group"],
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
    viewLevel: ["View Level", "View Level / Tree chart"],
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
  notifications: {
    markAllAsRead: ["Read Notification"],
    markAsRead: ["Read Notification"],
    readNotification: ["Read Notification"],
    unreadNotification: ["Unread Notification"],
    viewNotifications: ["Read Notification", "Unread Notification"],
  },
  reportManagement: {
    depositReport: ["Deposit Report"],
    historyReport: ["History Report"],
    ibWithdrawReport: ["IB Withdraw Report"],
    internalTransferReport: ["Internal Transfer Report"],
    loginActivity: ["Login Activity"],
    lotReport: ["Lot Report"],
    positionReport: ["Position Report"],
    userReport: ["User Report"],
    walletHistoryReport: ["Wallet History Report"],
    withdrawReport: ["Withdraw Report"],
  },
  rewardsManagement: {
    addRewards: ["Add Rewards"],
    rewardsList: ["Rewards List"],
  },
  "account-types": {
    accountTypesList: ["Account Types List"],
    createAccountType: ["Create Account Type"],
    editAccountType: ["Edit Account Type"],
    deleteAccountType: ["Delete Account Type"],
  },
  settingsManagement: {
    brokerDepositAccountList: ["Broker Deposit Account List"],
    createBrokerDepositAccount: ["Create Broker Deposit Account"],
    defaultSetting: ["Default Setting"],
    deleteBrokerDepositAccount: ["Delete Broker Deposit Account"],
    depositBankDetails: ["Deposit Bank Details"],
    editBrokerDepositAccount: ["Edit Broker Deposit Account"],
    enabledDisabledManager2fa: ["Enabled/Disabled Manager 2FA"],
    enabledDisabledUser2fa: ["Enabled/Disabled User 2FA"],
    manager2faList: ["Manager 2FA List"],
    promotionList: ["Promotion List"],
    pspSetting: ["Payment Method List", "Edit Payment Methods", "Delete Payment Methods"],
    user2faList: ["User 2FA List"],
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
    approveDepositList: ["Approve Deposit List", "Deposit List", "Approve/Reject Deposit"],
    approveRejectDeposit: ["Approve/Reject Deposit"],
    approveRejectWithdrawal: ["Approve/Reject Withdrawal"],
    approveWithdrawalList: ["Approve Withdrawal List", "Withdrawal List", "Approve/Reject Withdrawal"],
    clientDeposit: ["Client Deposit"],
    clientWithdraw: ["Client Withdraw"],
    depositList: ["Deposit List", "Pending Deposit List", "Approve Deposit List", "Reject Deposit List"],
    ibWithdraw: ["IB Withdraw"],
    internalTransfer: ["Internal Transfer"],
    pendingDepositList: ["Pending Deposit List", "Deposit List"],
    pendingIbWithdraw: ["Pending IB Withdraw"],
    pendingWithdraw: ["Pending Withdraw"],
    pendingWithdrawalList: ["Pending Withdraw", "Withdrawal List", "Pending Withdrawal List"],
    rejectDepositList: ["Reject Deposit List", "Deposit List"],
    rejectWithdrawalList: ["Reject Withdrawal List", "Withdrawal List"],
    walletDeposit: ["Wallet Deposit"],
    walletWithdraw: ["Wallet Withdraw"],
    withdrawalList: ["Withdrawal List", "Pending Withdraw", "Client Withdraw"],
  },
  userManagement: {
    addBankDetails: ["Add Bank Details"],
    addExistingClient: ["Add Existing Client"],
    addUser: ["Add User"],
    approveDocumentsList: [
      "Approve Documents List",
      "Approve Document List",
    ],
    approveRejectKyc: ["Approve/Reject KYC"],
    bankDetailsList: ["Bank Details List"],
    changeMt5Password: ["Change MT5 Password"],
    changeUserPassword: ["Change User Password"],
    createMt5Account: ["Create MT5 Account"],
    deleteBankDetails: ["Delete Bank Details"],
    deleteMt5Account: ["Delete MT5 Account"],
    deleteUser: ["Delete User"],
    editUser: ["Edit User"],
    followUpList: ["Follow Up List"],
    mt5UserList: ["MT5 User List"],
    pendingDocumentsList: ["Pending Documents List", "Pending Document List"],
    rejectDocumentList: ["Reject Document List"],
    resendMt5DataMail: ["Resend MT5 Data Mail"],
    resendVerificationMail: ["Resend Verification Mail"],
    resetGoogle2fa: ["Reset Google 2FA"],
    statusGoogle2fa: ["Status Google 2FA"],
    updateBankDetails: ["Update Bank Details"],
    updateMt5Leverage: ["Update MT5 Leverage"],
    uploadUserDocuments: ["Upload User Documents"],
    userList: ["User List"],
    userPasswordList: ["User Password List"],
    userSetting: ["User Setting"],
    viewUser: ["View User"],
  },
  bonusManagement: {
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
