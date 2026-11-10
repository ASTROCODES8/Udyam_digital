import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

const SPECIMENS_DIR = path.join(process.cwd(), 'public', 'specimens');
const files = fs.readdirSync(SPECIMENS_DIR).filter(f => f.endsWith('.png'));

console.log(`Found ${files.length} specimen files to extract.`);

const allResults = {};
if (fs.existsSync('scripts/extracted_specimens.json')) {
  try {
    Object.assign(allResults, JSON.parse(fs.readFileSync('scripts/extracted_specimens.json', 'utf8')));
  } catch (e) {}
}

async function processFile(file) {
  if (allResults[file] && Object.keys(allResults[file]).length > 0) {
    return allResults[file];
  }
  const filePath = path.join(SPECIMENS_DIR, file);
  const data = fs.readFileSync(filePath);
  
  const prompt = `You are a strict KYC document extractor.
Extract all relevant printed fields from this document image.
Return JSON with key-value string pairs.
For GST certificate: gstin, legal_name, trade_name, constitution, address, date_of_liability, registration_type.
For Udyam certificate: udyam_number, enterprise_name, major_activity, city, state, date_of_registration.
For Signatory ID: name, designation, business_name, id_number, valid_till.
For Address Proof / Utility Bill: billed_to, address, bill_date, consumer_no, units, amount.
Return ONLY valid JSON.`;

  try {
    const res = await model.generateContent([
      prompt,
      { inlineData: { data: data.toString('base64'), mimeType: 'image/png' } }
    ]);
    const text = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    allResults[file] = parsed;
    fs.writeFileSync('scripts/extracted_specimens.json', JSON.stringify(allResults, null, 2));
    console.log(`[OK] ${file}`);
    return parsed;
  } catch (err) {
    console.error(`[FAIL] ${file}: ${err.message}`);
    return null;
  }
}

async function main() {
  for (const f of files) {
    await processFile(f);
  }
  console.log('Extraction complete! Total saved:', Object.keys(allResults).length);
}

main();
