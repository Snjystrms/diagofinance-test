import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { otp, email } = body;

    // Validate input
    if (!otp || !email) {
      return NextResponse.json(
        { error: 'OTP and email are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format. OTP must be 6 digits.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Look up the OTP in your database for the given email
    // 2. Check if the OTP is valid and not expired
    // 3. Verify the OTP matches
    // 4. Update user verification status
    // 5. Generate authentication token if needed

    // For demo purposes, we'll simulate OTP verification
    console.log('OTP verification request:', { email, otp });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock verification logic - replace with actual database lookup
    // For now, accept demo OTPs for testing purposes
    if (otp === '123456' || otp === '865727') {
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          email,
          verifiedAt: new Date().toISOString(),
          status: 'verified'
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid OTP. Please check your email and try again.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 