# Utils Directory

This directory contains utility functions and API operations for the CRM application.

## Files

### `operations.ts`
Contains comprehensive API calling functions organized by feature area.

### `accent.ts`
Contains accent color utilities for the application theme.

### `index.ts`
Main export file that provides easy access to all utility functions.

## Usage

### Importing Operations

```typescript
// Import specific operations
import { userOperations, authOperations } from '@/utils/operations'

// Import all operations
import { apiOperations } from '@/utils/operations'

// Import utility functions
import { utilityFunctions } from '@/utils/operations'
```

### Using User Operations

```typescript
import { userOperations } from '@/utils/operations'

// Fetch pending users
const response = await userOperations.fetchPendingUsers(token)
if (response.success) {
  setPendingUsers(response.data.pendingUsers)
}

// Approve user
const approveResponse = await userOperations.approveUser(userId, token)
if (approveResponse.success) {
  toast.success('User approved successfully')
}
```

### Using Authentication Operations

```typescript
import { authOperations } from '@/utils/operations'

// Login user
const loginResponse = await authOperations.login({
  email: 'user@example.com',
  password: 'password123'
})

// Verify OTP
const otpResponse = await authOperations.verifyOtp({
  otp: '123456',
  email: 'user@example.com'
})
```

### Using Utility Functions

```typescript
import { utilityFunctions } from '@/utils/operations'

// Format date
const formattedDate = utilityFunctions.formatDate('2024-01-15T10:30:00Z')

// Format currency
const formattedAmount = utilityFunctions.formatCurrency(1234.56, 'USD')

// Generate random ID
const randomId = utilityFunctions.generateRandomId(10)

// Debounce function
const debouncedSearch = utilityFunctions.debounce(searchFunction, 300)
```

### Using Dashboard Operations

```typescript
import { dashboardOperations } from '@/utils/operations'

// Get dashboard stats
const statsResponse = await dashboardOperations.getDashboardStats(token)

// Get recent activities
const activitiesResponse = await dashboardOperations.getRecentActivities(token, 20)
```

### Using Transaction Operations

```typescript
import { transactionOperations } from '@/utils/operations'

// Submit USDT transaction
const transactionResponse = await transactionOperations.submitUsdtTransaction(
  transactionData,
  token
)

// Get transaction history
const historyResponse = await transactionOperations.getTransactionHistory(token, {
  page: 1,
  limit: 10,
  type: 'deposit'
})
```

### Using Team Operations

```typescript
import { teamOperations } from '@/utils/operations'

// Get team members
const teamResponse = await teamOperations.getTeamMembers(token, {
  page: 1,
  limit: 20,
  level: 1
})

// Get referral stats
const statsResponse = await teamOperations.getReferralStats(token)
```

### Using Income Operations

```typescript
import { incomeOperations } from '@/utils/operations'

// Get daily allegiance income
const incomeResponse = await incomeOperations.getDailyAllegianceIncome(token, {
  date: '2024-01-15',
  page: 1,
  limit: 10
})
```

### Using Wallet Operations

```typescript
import { walletOperations } from '@/utils/operations'

// Get wallet balance
const balanceResponse = await walletOperations.getWalletBalance(token)

// Request withdrawal
const withdrawalResponse = await walletOperations.requestWithdrawal(
  withdrawalData,
  token
)
```

### Using Support Operations

```typescript
import { supportOperations } from '@/utils/operations'

// Raise ticket
const ticketResponse = await supportOperations.raiseTicket(ticketData, token)

// Get ticket history
const historyResponse = await supportOperations.getTicketHistory(token, {
  page: 1,
  limit: 10,
  status: 'open'
})
```

## Error Handling

All API operations include built-in error handling:

```typescript
try {
  const response = await userOperations.fetchPendingUsers(token)
  if (response.success) {
    // Handle success
  } else {
    // Handle API error
    console.error(response.message)
  }
} catch (error) {
  // Handle network or other errors
  console.error('Error:', error.message)
}
```

## Configuration

The API base URL can be configured using environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=/api
```

## TypeScript Support

All functions are fully typed with TypeScript interfaces. The `ApiResponse<T>` generic type provides type safety for API responses.

## Best Practices

1. **Always handle errors**: Use try-catch blocks when calling API operations
2. **Check response success**: Verify `response.success` before processing data
3. **Use proper typing**: Leverage TypeScript generics for better type safety
4. **Token management**: Pass authentication tokens to protected endpoints
5. **Pagination**: Use pagination parameters for large data sets 