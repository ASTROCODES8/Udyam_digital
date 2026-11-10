import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUdyamFormat } from '@/lib/kyc/udyam';
import { maskIdentifier } from '@/lib/kyc/gstin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const udyam = searchParams.get('udyam')?.trim().toUpperCase();

    if (!udyam) {
      return NextResponse.json(
        { error: 'Udyam parameter is required' },
        { status: 400 }
      );
    }

    const formatCheck = validateUdyamFormat(udyam);
    const maskedUdyam = maskIdentifier(udyam);

    if (!formatCheck.valid) {
      return NextResponse.json({
        validFormat: false,
        maskedUdyam,
        errors: formatCheck.errors,
        found: false,
      });
    }

    const record = await prisma.udyamRecord.findUnique({
      where: { udyamNumber: udyam },
    });

    if (!record) {
      return NextResponse.json({
        validFormat: true,
        maskedUdyam,
        found: false,
        message: 'Udyam registration number passed format check but was not found in registry database.',
      });
    }

    return NextResponse.json({
      validFormat: true,
      found: true,
      maskedUdyam,
      record: {
        udyamNumber: record.udyamNumber,
        maskedUdyam,
        enterpriseName: record.enterpriseName,
        enterpriseType: record.enterpriseType, // Micro / Small / Medium
        majorActivity: record.majorActivity,
        nicDescription: record.nicDescription,
        state: record.state,
        city: record.city,
        dateOfRegistration: record.dateOfRegistration,
      },
    });
  } catch (error) {
    console.error('Error fetching Udyam:', error);
    return NextResponse.json(
      { error: 'Internal server error validating Udyam' },
      { status: 500 }
    );
  }
}
