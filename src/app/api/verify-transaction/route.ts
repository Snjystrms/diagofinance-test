import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hashcode, txHash } = body;

    // Validate input
    if (!hashcode || !txHash) {
      return NextResponse.json(
        { error: 'Hashcode and transaction hash are required' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Validate the hashcode against your database
    // 2. Verify the transaction hash on the blockchain
    // 3. Update verification status
    // 4. Send confirmation email

    // For demo purposes, we'll just log and return success
    console.log('Verification request:', { hashcode, txHash });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: 'Transaction verified successfully',
      data: {
        hashcode,
        txHash,
        verifiedAt: new Date().toISOString(),
        status: 'verified'
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verificationCode = searchParams.get('verificationcode');
  
  if (!verificationCode) {
    return NextResponse.json(
      { error: 'Verification code is required' },
      { status: 400 }
    );
  }

  // Here you would typically:
  // 1. Look up the verification code in your database
  // 2. Return the associated transaction details

  // For demo purposes, return mock data
  return NextResponse.json({
    success: true,
    verificationCode,
    transaction: {
      network: "BNB Smart Chain",
      amount: "30 USDT (BEP20)",
      address: "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0",
      status: "pending_verification"
    }
  });
} 