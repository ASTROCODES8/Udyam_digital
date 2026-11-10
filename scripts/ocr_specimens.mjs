import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
// Using gemini-3.8-flash
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

async function run() {
  const results = {};
  for (let i = 1; i <= 12; i++) {
    const kCode = 'K' + String(i).padStart(2, '0');
    const filename = `${kCode}_gst_certificate.png`;
    const filePath = path.join(process.cwd(), 'public', 'specimens', filename);
    if (!fs.existsSync(filePath)) {
      console.log(`${kCode}: File not found`);
      continue;
    }
    const data = fs.readFileSync(filePath);
    try {
      const res = await model.generateContent([
        `Read this GST certificate very carefully and return a JSON object with:
         - gstin: the exact 15 character Registration Number / GSTIN printed on the certificate
         - legal_name: Legal Name printed on the certificate
         - trade_name: Trade Name printed on the certificate
         - address: Principal Place of Business printed on the certificate
         Return ONLY valid JSON.`,
        { inlineData: { data: data.toString('base64'), mimeType: 'image/png' } }
      ]);
      const text = res.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        results[kCode] = parsed;
        console.log(`[${kCode}] GSTIN: ${parsed.gstin} | Legal: ${parsed.legal_name} | Trade: ${parsed.trade_name}`);
      } catch (e) {
        console.log(`[${kCode}] raw text:`, cleaned);
      }
    } catch (err) {
      console.error(`[${kCode}] API Error:`, err.message);
    }
  }
  fs.writeFileSync('scripts/ocr_gst_results.json', JSON.stringify(results, null, 2));
}

run();
