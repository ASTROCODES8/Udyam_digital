import * as fs from 'fs';
import * as path from 'path';
import { MOCK_EXTRACTIONS } from '../src/lib/kyc/extract';

interface TestMatrixEntry {
  filename: string;
  applicantId: string;
  docType: string;
  extractedFields: Record<string, string>;
  expectedStatus: 'PASS' | 'FAIL' | 'WARN';
  plantedDefect?: string;
  fileSize: number;
}

const SPECIMENS_DIR = path.resolve(process.cwd(), 'public', 'specimens');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'kyc_testmatrix.json');

const KNOWN_DEFECTS: Record<string, { status: 'PASS' | 'FAIL' | 'WARN'; defect: string }> = {
  K03_address: {
    status: 'FAIL',
    defect: 'Address proof dated 2026-03-01 (>90 days old relative to 2026-07-15)',
  },
  K05_gst: {
    status: 'FAIL',
    defect: 'GST certificate GSTIN does not match lead record',
  },
  K07_id: {
    status: 'FAIL',
    defect: 'Signatory ID name does not match authorized signatory',
  },
  K09_udyam: {
    status: 'FAIL',
    defect: 'Udyam certificate status is Cancelled',
  },
  K11_address: {
    status: 'FAIL',
    defect: 'Address proof city (Kolkata) does not match business registration city (Mumbai)',
  },
};

function getMockKey(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').toUpperCase();
  const applicantMatch = base.match(/^(K\d{2})/);
  if (!applicantMatch) return '';
  const prefix = applicantMatch[1];
  const lower = filename.toLowerCase();
  if (lower.includes('gst')) return `${prefix}_gst`;
  if (lower.includes('udyam')) return `${prefix}_udyam`;
  if (lower.includes('id') || lower.includes('signatory')) return `${prefix}_id`;
  if (lower.includes('address') || lower.includes('utility')) return `${prefix}_address`;
  return '';
}

async function generateTestMatrix() {
  console.log('Scanning specimen images in:', SPECIMENS_DIR);
  if (!fs.existsSync(SPECIMENS_DIR)) {
    console.error('Specimens directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(SPECIMENS_DIR).filter((f) => f.endsWith('.png') || f.endsWith('.jpg'));
  console.log(`Found ${files.length} specimen files.`);

  const matrix: Record<string, TestMatrixEntry> = {};

  for (const file of files) {
    const filePath = path.join(SPECIMENS_DIR, file);
    const stats = fs.statSync(filePath);
    const mockKey = getMockKey(file);
    const mockData = mockKey ? MOCK_EXTRACTIONS[mockKey] : null;

    const applicantId = file.slice(0, 3);
    const defectInfo = KNOWN_DEFECTS[mockKey];

    matrix[file] = {
      filename: file,
      applicantId,
      docType: mockData?.documentType || 'unknown',
      extractedFields: mockData?.extractedFields || {},
      expectedStatus: defectInfo ? defectInfo.status : 'PASS',
      plantedDefect: defectInfo ? defectInfo.defect : undefined,
      fileSize: stats.size,
    };
  }

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(matrix, null, 2), 'utf-8');
  console.log(`Successfully generated test matrix with ${Object.keys(matrix).length} entries at: ${OUTPUT_FILE}`);
}

generateTestMatrix()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error generating matrix:', err);
    process.exit(1);
  });
