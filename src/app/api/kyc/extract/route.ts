import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { extractDocument } from '@/lib/kyc/extract';
import { maskIdentifier } from '@/lib/kyc/gstin';

const UPLOADS_DIR = path.resolve(process.cwd(), 'private-uploads');
const MANIFEST_FILE = path.join(UPLOADS_DIR, 'manifest.json');

function saveUploadToPrivateDir(
  filename: string,
  buffer: Buffer,
  mimeType: string
): string {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const id = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = path.extname(filename) || '.png';
  const storedName = `${id}${ext}`;
  const filePath = path.join(UPLOADS_DIR, storedName);

  fs.writeFileSync(filePath, buffer);

  // 30 days retention policy compliant with DPDP Act 2023
  // Reference date: 2026-07-15 -> 2026-08-14
  const deleteAfter = '2026-08-14T00:00:00.000Z';

  let manifest: Array<{
    id: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    uploadedAt: string;
    deleteAfter: string;
    size: number;
  }> = [];

  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
    } catch {
      manifest = [];
    }
  }

  manifest.push({
    id,
    originalName: filename,
    storedName,
    mimeType,
    uploadedAt: new Date().toISOString(),
    deleteAfter,
    size: buffer.length,
  });

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

  return storedName;
}

export async function POST(request: NextRequest) {
  try {
    let filename = '';
    let docType = '';
    let imageBuffer: Buffer | undefined;
    let mimeType = 'image/png';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      docType = (formData.get('docType') as string) || '';
      filename = (formData.get('filename') as string) || (file ? file.name : '');

      if (file) {
        filename = filename || file.name;
        mimeType = file.type || 'image/png';
        const bytes = await file.arrayBuffer();
        imageBuffer = Buffer.from(bytes);
        saveUploadToPrivateDir(filename, imageBuffer, mimeType);
      }
    } else {
      const body = await request.json();
      filename = body.filename || '';
      docType = body.docType || '';
      if (body.imageBase64) {
        imageBuffer = Buffer.from(body.imageBase64, 'base64');
        mimeType = body.mimeType || 'image/png';
        saveUploadToPrivateDir(filename || 'specimen_doc.png', imageBuffer, mimeType);
      }
    }

    if (!filename && !imageBuffer) {
      return NextResponse.json(
        { error: 'Filename or file payload is required for extraction' },
        { status: 400 }
      );
    }

    const extraction = await extractDocument(filename, imageBuffer, mimeType, docType);

    // Mask sensitive identifiers for DPDP Act 2023 compliance
    const maskedFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(extraction.extractedFields)) {
      const lower = k.toLowerCase();
      if (
        lower.includes('gstin') ||
        lower.includes('udyam') ||
        lower.includes('id_number') ||
        lower.includes('aadhaar') ||
        lower.includes('pan')
      ) {
        maskedFields[k] = maskIdentifier(v);
      } else {
        maskedFields[k] = v;
      }
    }

    return NextResponse.json({
      success: extraction.success,
      documentType: extraction.documentType,
      extractedFields: extraction.extractedFields,
      maskedFields,
      confidence: extraction.confidence,
      issues: extraction.issues,
      isSkewed: extraction.isSkewed,
      isBlurred: extraction.isBlurred,
    });
  } catch (error) {
    console.error('[Smart KYC Extract API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to extract document information' },
      { status: 500 }
    );
  }
}
