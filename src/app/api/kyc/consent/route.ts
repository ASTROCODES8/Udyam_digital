import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      sessionId,
      phone,
      consentType = 'KYC_VERIFICATION',
      purpose = 'DPDP Act 2023 compliant consent for business identity verification and line provisioning',
      granted = true,
    } = body;

    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser';

    const logEntry = await prisma.consentLog.create({
      data: {
        orderId: orderId || null,
        sessionId: sessionId || null,
        phone: phone || null,
        consentType,
        purpose,
        granted: Boolean(granted),
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      id: logEntry.id,
      timestamp: logEntry.timestamp,
    });
  } catch (error) {
    console.error('Error logging consent:', error);
    return NextResponse.json(
      { error: 'Failed to record DPDP consent log' },
      { status: 500 }
    );
  }
}
