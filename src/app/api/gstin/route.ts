import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateGSTINFormat, maskIdentifier } from '@/lib/kyc/gstin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gstin = searchParams.get('gstin')?.trim().toUpperCase();

    if (!gstin) {
      return NextResponse.json(
        { error: 'GSTIN parameter is required' },
        { status: 400 }
      );
    }

    // 1. Format & checksum validation
    const formatCheck = validateGSTINFormat(gstin);
    const maskedGstin = maskIdentifier(gstin);

    if (!formatCheck.valid) {
      return NextResponse.json({
        validFormat: false,
        checksumValid: false,
        maskedGstin,
        errors: formatCheck.errors,
        found: false,
      });
    }

    // 2. Database lookup in mock registry
    const record = await prisma.gstinRecord.findUnique({
      where: { gstin },
    });

    if (!record) {
      return NextResponse.json({
        validFormat: true,
        checksumValid: true,
        maskedGstin,
        found: false,
        message: 'GSTIN passed format validation but was not found in the GST registry database.',
      });
    }

    // Return sanitized record with masked identifier for privacy
    return NextResponse.json({
      validFormat: true,
      checksumValid: true,
      found: true,
      maskedGstin,
      record: {
        gstin: record.gstin,
        maskedGstin,
        legalName: record.legalName,
        tradeName: record.tradeName,
        constitution: record.constitution,
        principalPlaceOfBusiness: record.principalPlaceOfBusiness,
        state: record.state,
        registrationDate: record.registrationDate,
        status: record.status, // Active, Cancelled, Suspended
      },
    });
  } catch (error) {
    console.error('Error fetching GSTIN:', error);
    return NextResponse.json(
      { error: 'Internal server error validating GSTIN' },
      { status: 500 }
    );
  }
}
