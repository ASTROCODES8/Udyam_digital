import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maskIdentifier } from '@/lib/kyc/gstin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, otp, signatoryName, idNumber } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (otp !== '123456') {
      return NextResponse.json(
        { success: false, error: 'Invalid Aadhaar OTP. Please enter 123456 for hackathon evaluation.' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: `Order ${orderId} not found` }, { status: 404 });
    }

    // 1. Update Order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'KYC_COMPLETE',
        kycStatus: 'VERIFIED',
      },
    });

    // 2. Log Order Event
    await prisma.orderEvent.create({
      data: {
        orderId,
        status: 'KYC_VERIFIED',
        title: 'KYC Verified & Digitally Signed',
        description: `Smart KYC cross-checks verified. Document legally e-signed by ${signatoryName || order.contactName} (${maskIdentifier(idNumber || 'XXXX-XXXX-1234')}) via UIDAI OTP.`,
        completed: true,
        metadata: JSON.stringify({
          signedAt: new Date().toISOString(),
          authMethod: 'UIDAI_OTP',
          signer: signatoryName || order.contactName,
        }),
      },
    });

    // 3. Update KycCase
    await prisma.kycCase.upsert({
      where: { orderId },
      update: {
        overallStatus: 'VERIFIED',
        signatoryName: signatoryName || order.contactName,
      },
      create: {
        orderId,
        businessName: order.businessName,
        overallStatus: 'VERIFIED',
        signatoryName: signatoryName || order.contactName,
      },
    });

    return NextResponse.json({
      success: true,
      orderId,
      status: 'KYC_COMPLETE',
      redirectUrl: `/track/${orderId}`,
    });
  } catch (error) {
    console.error('Error during e-sign:', error);
    return NextResponse.json(
      { error: 'Internal server error processing digital signature' },
      { status: 500 }
    );
  }
}
