# OTP Verification System

This document describes the OTP (One-Time Password) verification system implemented in the CRM application.

## Overview

The OTP verification system allows users to verify their email addresses by entering a 6-digit code sent to their email inbox.

## Components

### 1. CheckEmailPage Component
- **Location**: `src/app/(auth)/check-email/page.tsx`
- **Purpose**: Displays the OTP input form and handles verification
- **Features**:
  - OTP input field (6 digits)
  - Real-time validation
  - Error handling and display
  - Success state with auto-redirect
  - Resend OTP functionality with countdown timer
  - Auto-focus on OTP input

### 2. OTP Verification API
- **Endpoint**: `/api/user/verify-otp`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "otp": "123456",
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "data": {
      "email": "user@example.com",
      "verifiedAt": "2024-01-01T00:00:00.000Z",
      "status": "verified"
    }
  }
  ```

## Usage Flow

1. **User Registration**: User registers with email address
2. **Email Sent**: System sends OTP to user's email
3. **OTP Input**: User navigates to check-email page and enters OTP
4. **Verification**: System validates OTP against stored value
5. **Success**: User is redirected to dashboard upon successful verification

## Demo OTPs

For testing purposes, the following OTPs are accepted:
- `123456` (default demo OTP)
- `865727` (from the email example)

## Implementation Notes

### Frontend Features
- Input validation (6 digits only)
- Loading states during verification
- Error handling and user feedback
- Responsive design with mobile support
- Auto-focus for better UX

### Backend Features
- Input validation (OTP format, email format)
- Mock verification logic (replace with database integration)
- Proper error handling and HTTP status codes
- Logging for debugging

## Integration Points

### Database Integration
To integrate with a real database, modify the API route to:
1. Store OTPs in database with expiration times
2. Look up OTPs by email address
3. Validate OTP expiration
4. Update user verification status

### Email Service Integration
To send real OTP emails, integrate with:
- SendGrid
- AWS SES
- Nodemailer
- Or any other email service provider

## Security Considerations

1. **OTP Expiration**: OTPs should expire after a reasonable time (e.g., 15 minutes)
2. **Rate Limiting**: Implement rate limiting for OTP requests
3. **Secure Storage**: Store OTPs securely (hashed if possible)
4. **Audit Logging**: Log all verification attempts for security monitoring

## Future Enhancements

1. **SMS OTP**: Add SMS-based OTP verification
2. **Backup Codes**: Provide backup verification codes
3. **Two-Factor Authentication**: Extend to 2FA functionality
4. **Remember Device**: Option to remember verified devices

## Testing

1. Navigate to `/check-email?email=test@example.com`
2. Enter one of the demo OTPs
3. Verify successful redirect to dashboard
4. Test error scenarios with invalid OTPs
5. Test resend functionality

## Troubleshooting

### Common Issues
1. **OTP not working**: Check if using correct demo OTP
2. **Email not found**: Ensure email parameter is passed in URL
3. **Verification fails**: Check browser console for API errors
4. **Redirect not working**: Verify dashboard route exists

### Debug Mode
Enable console logging in the API route to debug verification requests. 