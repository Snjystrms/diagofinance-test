# Registration Fee System

This document explains the new registration fee system implemented in the CRM application.

## Overview

The registration fee system requires new users to pay a one-time fee of **25 USDT** to activate their accounts and access all platform features.

## How It Works

### 1. User Registration Flow
- When a user registers, their account is created with `type: 'user'` and `is_account_active: false`
- The system automatically detects inactive user accounts
- All sidebar navigation tabs are disabled until the registration fee is paid

### 2. Registration Fee Modal
- Users see a prominent modal explaining the registration fee requirement
- The modal includes:
  - QR code for payment
  - Payment address (USDT BEP20 on BNB Smart Chain)
  - Transaction hash submission form
  - Step-by-step instructions

### 3. Account Activation
- After payment verification, the user's account is activated
- `is_account_active` is set to `true`
- Full access to all sidebar navigation and features is granted

## Implementation Details

### Components Created

#### `RegistrationFeeModal` (`/src/components/registration-fee-modal.tsx`)
- Modal component for collecting registration fee payments
- Handles transaction hash submission and verification
- Shows payment status (pending, submitted, confirmed)

#### Modified `MainLayout` (`/src/components/main-layout.tsx`)
- Conditionally renders registration fee modal
- Disables sidebar navigation for inactive users
- Shows account activation required message

#### Modified `AppSidebar` (`/src/components/app-sidebar.tsx`)
- Disables navigation items for inactive users
- Shows warning message about account activation requirement

#### Modified `USDT-Deposit` page (`/src/app/USDT-Deposit/page.tsx`)
- Detects if user needs to pay registration fee
- Shows different content based on account status
- Redirects to registration fee payment if needed

### Test Page

#### `/test-registration-fee` (`/src/app/test-registration-fee/page.tsx`)
- Allows testing different user states
- Simulates inactive user, active user, and admin accounts
- Useful for development and testing

## User States

### 1. Guest User (No Authentication)
- No access to dashboard
- Must login/register first

### 2. Inactive User (`type: 'user'`, `is_account_active: false`)
- Registration fee modal is shown
- Sidebar navigation is disabled
- Limited access to platform features
- Must pay 25 USDT registration fee

### 3. Active User (`type: 'user'`, `is_account_active: true`)
- Full access to all features
- Normal sidebar navigation
- Can make USDT deposits and use all platform features

### 4. Admin User (`type: 'admin'`)
- Full administrative access
- Bypasses registration fee requirement
- Access to admin-specific navigation and features

## Testing the System

### 1. Test Inactive User
```typescript
// Simulate inactive user account
setUser({
  id: "test-user-1",
  name: "Test User",
  email: "test@example.com",
  type: "user",
  is_account_active: false,
  status: true
});
```

### 2. Test Active User
```typescript
// Simulate active user account
setUser({
  id: "test-user-2",
  name: "Active User",
  email: "active@example.com",
  type: "user",
  is_account_active: true,
  status: true
});
```

### 3. Test Admin User
```typescript
// Simulate admin account
setUser({
  id: "test-admin-1",
  name: "Admin User",
  email: "admin@example.com",
  type: "admin",
  is_account_active: true,
  status: true
});
```

## Configuration

### Registration Fee Amount
The registration fee amount is set to **25 USDT** and can be modified in:
- `RegistrationFeeModal` component
- `USDT-Deposit` page

### Payment Network
- **Network**: BNB Smart Chain (BSC)
- **Token**: USDT (BEP20)
- **Address**: `0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0`

## Security Considerations

1. **Payment Verification**: All transaction hashes are verified on the blockchain
2. **Account Isolation**: Inactive users cannot access sensitive features
3. **Admin Override**: Admin users can bypass restrictions for support purposes
4. **Session Management**: User state is properly managed through auth context

## Future Enhancements

1. **Payment Gateway Integration**: Connect to actual payment processors
2. **Automated Verification**: Automatically verify payments on blockchain
3. **Multiple Payment Methods**: Support for other cryptocurrencies or fiat
4. **Payment History**: Track all registration fee payments
5. **Refund System**: Handle payment disputes and refunds

## Troubleshooting

### Common Issues

1. **Modal Not Showing**: Check if user has `type: 'user'` and `is_account_active: false`
2. **Navigation Still Enabled**: Verify the `MainLayout` component is properly checking user status
3. **Payment Not Processing**: Ensure transaction hash format is correct (starts with "0x")
4. **Account Not Activating**: Check if the payment verification API is working

### Debug Steps

1. Check browser console for errors
2. Verify user object in auth context
3. Test with different user states using the test page
4. Check network requests for payment verification

## Support

For technical support or questions about the registration fee system, please refer to the development team or create an issue in the project repository. 