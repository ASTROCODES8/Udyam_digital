import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'private-uploads');
const MANIFEST_FILE = path.join(UPLOADS_DIR, 'manifest.json');
const NOW_REFERENCE = '2026-07-15T00:00:00.000Z';

interface UploadManifestItem {
  id: string;
  originalName: string;
  storedName: string;
  uploadedAt: string;
  deleteAfter: string;
  size: number;
}

export function purgeExpiredUploads(currentDateIso: string = NOW_REFERENCE): {
  purgedCount: number;
  remainingCount: number;
  purgedFiles: string[];
} {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return { purgedCount: 0, remainingCount: 0, purgedFiles: [] };
  }

  const manifestData: UploadManifestItem[] = JSON.parse(
    fs.readFileSync(MANIFEST_FILE, 'utf-8')
  );

  const compareDate = new Date(currentDateIso);
  const remaining: UploadManifestItem[] = [];
  const purgedFiles: string[] = [];

  for (const item of manifestData) {
    const deleteAfterDate = new Date(item.deleteAfter);
    if (deleteAfterDate <= compareDate) {
      // Expired - delete file
      const filePath = path.join(UPLOADS_DIR, item.storedName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          purgedFiles.push(item.storedName);
        } catch (e) {
          console.error(`Failed to delete ${filePath}:`, e);
        }
      }
    } else {
      remaining.push(item);
    }
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(remaining, null, 2), 'utf-8');

  return {
    purgedCount: purgedFiles.length,
    remainingCount: remaining.length,
    purgedFiles,
  };
}

// CLI execution
if (require.main === module) {
  console.log(`[Smart KYC Purge] Running upload purge script (Reference date: ${NOW_REFERENCE})...`);
  const result = purgeExpiredUploads();
  console.log(`[Smart KYC Purge] Purged ${result.purgedCount} expired files. ${result.remainingCount} files retained.`);
  process.exit(0);
}
