# CRM Authentication System

A complete authentication system built with Next.js, TanStack Query, and shadcn/ui components.

## Features           

- ✅ **User Registration** - Complete registration form with validation
- ✅ **Email Verification** - OTP verification system
- ✅ **User Login** - Secure login with JWT tokens
- ✅ **Password Reset** - Forgot password and reset functionality
- ✅ **Resend OTP** - Ability to resend verification codes
- ✅ **Protected Routes** - Authentication-based route protection
- ✅ **Form Validation** - Zod schema validation
- ✅ **Loading States** - TanStack Query loading indicators
- ✅ **Toast Notifications** - Success/error feedback
- ✅ **Responsive Design** - Mobile-friendly UI
- ✅ **Dark/Light Theme** - Theme switching support

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context (no Zustand)
- **Data Fetching**: TanStack Query
- **Form Handling**: React Hook Form + Zod
- **Notifications**: React Hot Toast
- **Icons**: Lucide React

## API Endpoints

The application integrates with the following backend APIs:

### Authentication APIs

1. **POST /user/register**
   - Registers a new user
   - Sends OTP to user's email
   - Redirects to verify OTP page

2. **POST /user/verify-otp**
   - Verifies OTP for account activation
   - Redirects to login page on success

3. **POST /user/login***
   - Authenticates user with email/password
   - Returns JWT token and user data
   - Redirects to dashboard on success

4. **POST /user/resend-otp**
   - Resends OTP to user's email
   - Available on verify OTP page

5. **POST /user/forget-password**
   - Sends password reset instructions
   - Redirects to reset password page

6. **POST /user/reset-password***
   - Resets password with token
   - Redirects to login page on success

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.45:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify-otp/
│   │   ├── forget-password/
│   │   └── reset-password/
│   ├── (dashboard)/       # Protected dashboard pages
│   │   └── dashboard/
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── header.tsx        # Header with user menu
│   ├── main-layout.tsx   # Dashboard layout
│   ├── protected-route.tsx # Route protection
│   └── query-provider.tsx # TanStack Query provider
├── contexts/             # React Context providers
│   └── auth-context.tsx  # Authentication state
├── hooks/               # Custom hooks
│   └── use-auth-mutations.ts # TanStack Query mutations
├── lib/                 # Utility functions
│   ├── api.ts           # API functions
│   ├── utils.ts         # Utility functions
│   └── validations.ts   # Zod validation schemas
```

## Authentication Flow 

1. **Registration**: User fills registration form → OTP sent → Verify OTP → Login
2. **Login**: User enters credentials → JWT token stored → Dashboard access
3. **Password Reset**: User requests reset → Token sent → Reset password → Login
4. **Logout**: User logs out → Token cleared → Redirect to login

## Form Validation ##

All forms use Zod schemas for validation:

- **Register**: Name, email, password, confirm password, mobile, country code, referral code
- **Login**: Email, password
- **Verify OTP**: Email, OTP (4-6 digits)
- **Forgot Password**: Email
- **Reset Password**: Token, new password, confirm password

## API Integration

The application expects the backend to return responses in this format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
```

For login, the response should include:

```typescript
interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://192.168.1.45:3000` |

## Development

### Available Scripts ##

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Pages 

1. Create page component in appropriate directory
2. Add route protection if needed
3. Update navigation if required

### Adding New API Endpoints

1. Add function to `src/lib/api.ts`
2. Create mutation in `src/hooks/use-auth-mutations.ts`
3. Add validation schema in `src/lib/validations.ts`

## Deployment ##

The application can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **Railway**
- **AWS Amplify**

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable in your deployment platform.

## Contributing ##

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
