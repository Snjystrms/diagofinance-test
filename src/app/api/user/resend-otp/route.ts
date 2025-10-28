import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: Integrate with your actual OTP service
    // This is where you would:
    // 1. Generate a new OTP
    // 2. Send it via email service (SendGrid, AWS SES, etc.)
    // 3. Store the OTP in your database with expiration
    // 4. Update any existing OTP records for this email

    // For now, we'll simulate the process
    console.log(`Resending OTP to: ${email}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return success response
    return NextResponse.json(
      { 
        message: 'OTP resent successfully',
        email: email,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error resending OTP:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 