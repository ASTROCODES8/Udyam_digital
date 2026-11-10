import fs from 'fs';
import path from 'path';

const SPECIMENS_DATA = {
  K01: {
    kCode: 'K01',
    leadId: 'L00045',
    businessName: 'Vindhya Tours & Travels',
    legalName: 'Neha Kaur (Prop. Vindhya Tours & Travels)',
    tradeName: 'Vindhya Tours & Travels',
    contactName: 'Neha Kaur',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    gstin: '37IHKXV5167L1ZS',
    gstinStatus: 'Cancelled',
    gstinPlantedDefect: 'GSTIN is Cancelled in official registry',
    udyamNumber: '',
    udyamPlantedDefect: 'Udyam registration number is blank on certificate',
    idName: 'Neha Kaur',
    idDesignation: 'Office admin',
    idNumber: 'SYN-ID-346190',
    idValidTill: '2028-03-26',
    billAddress: 'Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383',
    billDate: '2026-06-26',
    billConsumerNo: '9485717625',
  },
  K02: {
    kCode: 'K02',
    leadId: 'L01287',
    businessName: 'Harmony Dental Care',
    legalName: 'Joseph Shah (Prop. Harmony Dental Care)',
    tradeName: 'Harmony Dental Care',
    contactName: 'Joseph Shah',
    city: 'Kolkata',
    state: 'West Bengal',
    gstin: '19EOGXH4115Y1ZL',
    gstinStatus: 'Active',
    gstinPlantedDefect: 'GST certificate photographed at a slant (~15 deg, auto-deskew applied)',
    isSkewed: true,
    udyamNumber: 'UDYAM-WB-00-5053330',
    idName: 'Joseph Shah',
    idDesignation: 'Manager',
    idNumber: 'SYN-ID-816907',
    idValidTill: '2028-09-10',
    billAddress: 'Shop/Unit 199, Station Road, Kolkata, West Bengal - 347550',
    billDate: '2026-05-22',
    billConsumerNo: '9790713533',
  },
  K03: {
    kCode: 'K03',
    leadId: 'L03571',
    businessName: 'Ganesh Woodcraft',
    legalName: 'Joseph Singh (Prop. Ganesh Woodcraft)',
    tradeName: 'Ganesh Woodcraft',
    contactName: 'Joseph Singh',
    city: 'Nagpur',
    state: 'Maharashtra',
    gstin: '27XUIXG0767D1ZP',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-MH-00-9516696',
    idName: 'Joseph Singh',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-447889',
    idValidTill: '2028-07-04',
    billAddress: 'Shop/Unit 80, Civil Lines, Nagpur, Maharashtra - 411231',
    billDate: '2026-05-30',
    billConsumerNo: '3438517928',
  },
  K04: {
    kCode: 'K04',
    leadId: 'L01014',
    businessName: 'Saffron Dental Care LLP',
    legalName: 'Saffron Dental Care LLP',
    tradeName: 'Saffron Dental Care LLP',
    contactName: 'Fatima Pillai',
    city: 'Nagpur',
    state: 'Maharashtra',
    gstin: '27PZSXS1936O1ZH',
    gstinStatus: 'Active',
    gstinPlantedDefect: 'GST certificate is blurred and unreadable (re-upload requested)',
    isBlurred: true,
    udyamNumber: 'UDYAM-MH-00-6131836',
    idName: 'Fatima Pillai',
    idDesignation: 'Partner',
    idNumber: 'SYN-ID-609396',
    idValidTill: '2028-08-03',
    billAddress: 'Shop/Unit 75, Lake View Colony, Nagpur, Maharashtra - 137452',
    billDate: '2026-05-28',
    billConsumerNo: '7397844759',
  },
  K05: {
    kCode: 'K05',
    leadId: 'L04014',
    businessName: 'Balaji Realty LLP',
    legalName: 'Balaji Realty LLP',
    tradeName: 'Balaji Realty LLP',
    contactName: 'Anita Shah',
    city: 'Kochi',
    state: 'Kerala',
    gstin: '32TZAXB5481U1Z1',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-KL-00-5521886',
    udyamPlantedDefect: 'Udyam certificate missing (only 3 documents uploaded)',
    missingUdyamDoc: true,
    idName: 'Anita Shah',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-587234',
    idValidTill: '2029-09-11',
    billAddress: 'Shop/Unit 38, Civil Lines, Kochi, Kerala - 752083',
    billDate: '2026-06-11',
    billConsumerNo: '4294969054',
  },
  K06: {
    kCode: 'K06',
    leadId: 'L00115',
    businessName: 'Saffron Unisex Salon',
    legalName: 'Pooja Shah (Prop. Saffron Unisex Salon)',
    tradeName: 'Saffron Unisex Salon',
    contactName: 'Pooja Shah',
    city: 'Jaipur',
    state: 'Rajasthan',
    gstin: '08YKZXS8189L1Z0',
    registeredGstin: '08YKZXS5189L1ZO',
    gstinStatus: 'Active',
    gstinPlantedDefect: 'GSTIN checksum failure: character tampering detected (8189 vs 5189)',
    udyamNumber: 'UDYAM-RJ-00-6577157',
    idName: 'Pooja Shah',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-118354',
    idValidTill: '2028-09-15',
    billAddress: 'Shop/Unit 71, Market Yard, Jaipur, Rajasthan - 194057',
    billDate: '2026-06-11',
    billConsumerNo: '9566781101',
  },
  K07: {
    kCode: 'K07',
    leadId: 'L03349',
    businessName: 'Neelgiri Physio Clinic',
    legalName: 'Neha Banerjee (Prop. Shri Physio Clinic)',
    tradeName: 'Neelgiri Physio Clinic',
    contactName: 'Neha Banerjee',
    city: 'Delhi',
    state: 'Delhi',
    gstin: '07CPCXN0398P1ZT',
    gstinStatus: 'Active',
    gstinPlantedDefect: 'Entity name mismatch: certificate says Prop. Shri Physio Clinic vs registry Neelgiri Physio Clinic',
    udyamNumber: 'UDYAM-DL-00-9565547',
    idName: 'Neha Banerjee',
    idDesignation: 'Manager',
    idNumber: 'SYN-ID-178237',
    idValidTill: '2030-05-05',
    billAddress: 'Shop/Unit 52, Transport Nagar, Delhi, Delhi - 334596',
    billDate: '2026-07-05',
    billConsumerNo: '7545812405',
  },
  K08: {
    kCode: 'K08',
    leadId: 'L03473',
    businessName: 'Green Leaf Legal Associates',
    legalName: 'Joseph Rao (Prop. Green Leaf Legal Associates)',
    tradeName: 'Green Leaf Legal Associates',
    contactName: 'Joseph Rao',
    city: 'Vadodara',
    state: 'Gujarat',
    gstin: '24XORXG9365M1Z3',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-GJ-00-8477445',
    idName: 'Joseph Rao',
    idDesignation: 'Office admin',
    idNumber: 'SYN-ID-393148',
    idValidTill: '2027-09-18',
    billAddress: 'Shop/Unit 238, Ring Road, Vadodara, Gujarat - 348176',
    billDate: '2026-05-26',
    billConsumerNo: '2568472785',
  },
  K09: {
    kCode: 'K09',
    leadId: 'L04779',
    businessName: 'Kaveri Insurance Advisors',
    legalName: 'Anita Kulkarni (Prop. Kaveri Insurance Advisors)',
    tradeName: 'Kaveri Insurance Advisors',
    contactName: 'Anita Kulkarni',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    gstin: '37LDYXK0296F1ZB',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-AP-00-9751562',
    idName: 'Anita Kulkarni',
    idDesignation: 'Office admin',
    idNumber: 'SYN-ID-126040',
    idValidTill: '2027-12-22',
    billAddress: 'Shop/Unit 217, Civil Lines, Visakhapatnam, Andhra Pradesh - 405337',
    billDate: '2026-07-10',
    billConsumerNo: '9375012581',
  },
  K10: {
    kCode: 'K10',
    leadId: 'L04525',
    businessName: 'Kaveri Stays LLP',
    legalName: 'Kaveri Stays LLP',
    tradeName: 'Kaveri Stays LLP',
    contactName: 'Fatima Menon',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstin: '27QHJXK0658U1ZL',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-MH-00-7183141',
    idName: 'Nisha Arora',
    idPlantedDefect: 'Signatory photo ID name (Nisha Arora) does not match lead business contact (Fatima Menon)',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-247542',
    idValidTill: '2029-06-01',
    billAddress: 'Shop/Unit 21, Sector 14, Mumbai, Maharashtra - 570043',
    billDate: '2026-06-18',
    billConsumerNo: '6910330901',
  },
  K11: {
    kCode: 'K11',
    leadId: 'L03485',
    businessName: 'Trinity Bake House Pvt Ltd',
    legalName: 'Trinity Bake House Pvt Ltd',
    tradeName: 'Trinity Bake House Pvt Ltd',
    contactName: 'Vikram Pillai',
    city: 'Ludhiana',
    state: 'Punjab',
    gstin: '03KGZXT1320R1ZZ',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-PB-00-9719478',
    idName: 'Vikram Pillai',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-440312',
    idValidTill: '2028-12-23',
    billAddress: 'Shop/Unit 188, Industrial Area Phase 2, Ludhiana, Punjab - 541498',
    billDate: '2025-10-31',
    billPlantedDefect: 'Address proof bill date 2025-10-31 is 257 days old (>90 days limit relative to 2026-07-15)',
    billConsumerNo: '2710511786',
  },
  K12: {
    kCode: 'K12',
    leadId: 'L03558',
    businessName: 'Star Electronics',
    legalName: 'Pooja Agarwal (Prop. Star Electronics)',
    tradeName: 'Star Electronics',
    contactName: 'Pooja Agarwal',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    gstin: '37NBLXS1145E1ZU',
    gstinStatus: 'Active',
    udyamNumber: 'UDYAM-AP-00-5186772',
    idName: 'Pooja Agarwal',
    idDesignation: 'Owner',
    idNumber: 'SYN-ID-365512',
    idValidTill: '2029-03-03',
    billAddress: 'Shop/Unit 216, Nehru Nagar, Visakhapatnam, Andhra Pradesh - 762071',
    billDate: '2026-07-06',
    billConsumerNo: '6982457282',
  },
};

// 1. Generate kyc_testmatrix.json
function updateTestMatrix() {
  const specimensDir = path.resolve('public', 'specimens');
  const files = fs.readdirSync(specimensDir).filter(f => f.endsWith('.png'));
  const matrix = {};

  for (const file of files) {
    const filePath = path.join(specimensDir, file);
    const stats = fs.statSync(filePath);
    const applicantId = file.slice(0, 3);
    const d = SPECIMENS_DATA[applicantId];
    if (!d) continue;

    let docType = 'unknown';
    let extractedFields = {};
    let expectedStatus = 'PASS';
    let plantedDefect = undefined;

    if (file.includes('gst')) {
      docType = 'gst_certificate';
      extractedFields = {
        gstin: d.gstin,
        legal_name: d.legalName,
        trade_name: d.tradeName,
        status: d.gstinStatus,
      };
      if (d.gstinPlantedDefect) {
        expectedStatus = d.isSkewed ? 'WARN' : 'FAIL';
        plantedDefect = d.gstinPlantedDefect;
      }
    } else if (file.includes('udyam')) {
      docType = 'udyam_certificate';
      extractedFields = {
        udyam_number: d.udyamNumber,
        enterprise_name: d.businessName,
        city: d.city,
        state: d.state,
      };
      if (d.udyamPlantedDefect) {
        expectedStatus = 'FAIL';
        plantedDefect = d.udyamPlantedDefect;
      }
    } else if (file.includes('signatory') || file.includes('id')) {
      docType = 'signatory_id';
      extractedFields = {
        name: d.idName,
        designation: d.idDesignation,
        business_name: d.businessName,
        id_number: d.idNumber,
        valid_till: d.idValidTill,
      };
      if (d.idPlantedDefect) {
        expectedStatus = 'FAIL';
        plantedDefect = d.idPlantedDefect;
      }
    } else if (file.includes('address')) {
      docType = 'address_proof';
      extractedFields = {
        billed_to: d.businessName,
        address: d.billAddress,
        city: d.city,
        date: d.billDate,
        consumer_no: d.billConsumerNo,
      };
      if (d.billPlantedDefect) {
        expectedStatus = 'FAIL';
        plantedDefect = d.billPlantedDefect;
      }
    }

    matrix[file] = {
      filename: file,
      applicantId,
      docType,
      extractedFields,
      expectedStatus,
      plantedDefect,
      fileSize: stats.size,
    };
  }

  fs.writeFileSync('data/kyc_testmatrix.json', JSON.stringify(matrix, null, 2), 'utf-8');
  console.log(`Updated data/kyc_testmatrix.json with ${Object.keys(matrix).length} files.`);
}

// 2. Generate MOCK_EXTRACTIONS for extract.ts
function generateMockExtractionsCode() {
  const parts = [];
  for (const [k, d] of Object.entries(SPECIMENS_DATA)) {
    const kComment = `// ── ${k} ──────────────────────────────────────────`;
    const isSkewedCode = d.isSkewed ? `\n    isSkewed: true,` : ``;
    const isBlurredCode = d.isBlurred ? `\n    isBlurred: true,` : ``;
    const gstIssues = d.isSkewed ? `['Document photographed at a slant. Auto-deskew applied.']`
      : d.isBlurred ? `['GST certificate photo is severely blurred. Re-upload requested.']`
      : d.kCode === 'K06' ? `['Checksum validation mismatch detected: altered 8th digit (8189 vs official registry 5189)']`
      : d.kCode === 'K07' ? `['Certificate business name "Prop. Shri Physio Clinic" does not match registry legal entity "Neelgiri Physio Clinic"']`
      : d.gstinPlantedDefect ? `['${d.gstinPlantedDefect}']`
      : `[]`;

    const gstConfidence = d.isBlurred ? 0.45 : 0.97;

    const gstPart = `  ${k}_gst: {
    success: true,
    documentType: 'gst_certificate',${isSkewedCode}${isBlurredCode}
    extractedFields: {
      gstin: '${d.gstin}',
      legal_name: '${d.legalName}',
      trade_name: '${d.tradeName}',
      status: '${d.gstinStatus}',
    },
    confidence: ${gstConfidence},
    issues: ${gstIssues},
  },`;

    const udyamPart = d.missingUdyamDoc ? `` : `  ${k}_udyam: {
    success: true,
    documentType: 'udyam_certificate',
    extractedFields: {
      udyam_number: '${d.udyamNumber}',
      enterprise_name: '${d.businessName}',
      city: '${d.city}',
      state: '${d.state}',
      status: 'Active',
    },
    confidence: 0.95,
    issues: ${d.udyamPlantedDefect ? `['${d.udyamPlantedDefect}']` : '[]'},
  },`;

    const idPart = `  ${k}_id: {
    success: true,
    documentType: 'signatory_id',
    extractedFields: {
      name: '${d.idName}',
      designation: '${d.idDesignation}',
      business_name: '${d.businessName}',
      id_type: 'Photo ID',
      id_number: '${d.idNumber}',
      valid_till: '${d.idValidTill}',
    },
    confidence: 0.96,
    issues: ${d.idPlantedDefect ? `['${d.idPlantedDefect}']` : '[]'},
  },`;

    const addressPart = `  ${k}_address: {
    success: true,
    documentType: 'address_proof',
    extractedFields: {
      billed_to: '${d.businessName}',
      address: '${d.billAddress}',
      city: '${d.city}',
      date: '${d.billDate}',
      consumer_no: '${d.billConsumerNo}',
      type: 'Electricity Bill',
    },
    confidence: 0.94,
    issues: ${d.billPlantedDefect ? `['${d.billPlantedDefect}']` : '[]'},
  },`;

    parts.push([kComment, gstPart, udyamPart, idPart, addressPart].filter(Boolean).join('\n'));
  }

  return `export const MOCK_EXTRACTIONS: Record<string, ExtractionResult> = {\n${parts.join('\n\n')}\n};`;
}

// 3. Update extract.ts
function updateExtractTs() {
  const file = 'src/lib/kyc/extract.ts';
  let text = fs.readFileSync(file, 'utf-8');
  const code = generateMockExtractionsCode();
  text = text.replace(/export const MOCK_EXTRACTIONS: Record<string, ExtractionResult> = {[\s\S]*?\n\};\n/, code + '\n');
  fs.writeFileSync(file, text, 'utf-8');
  console.log('Updated src/lib/kyc/extract.ts');
}

// 4. Generate SPECIMEN_DOCS_STORE and PRESET_CONFIGS for page.tsx
function generateSpecimenDocsStoreCode() {
  const parts = [];
  for (const [k, d] of Object.entries(SPECIMENS_DATA)) {
    const gstExtra = d.isSkewed ? `isSkewed: true,\n        `
      : d.isBlurred ? `isBlurred: true,\n        `
      : ``;

    const udyamBlock = d.missingUdyamDoc ? `` : `    udyam_certificate: {
      filename: "${k}_udyam_certificate.png",
      docType: "udyam_certificate",
      extractedFields: {
        udyam_number: "${d.udyamNumber}",
        enterprise_name: "${d.businessName}",
        city: "${d.city}",
        state: "${d.state}",
        status: "Active",
      },
      maskedFields: {
        udyam_number: "${d.udyamNumber ? d.udyamNumber.slice(0, 8) + '***' + d.udyamNumber.slice(-3) : '(Blank / Not Found)'}",
        enterprise_name: "${d.businessName}",
        status: "Active",
      },
      confidence: 0.95,
    },`;

    parts.push(`  // ── ${k} ──
  ${k}: {
    gst_certificate: {
      filename: "${k}_gst_certificate.png",
      docType: "gst_certificate",
      ${gstExtra}extractedFields: {
        gstin: "${d.gstin}",
        legal_name: "${d.legalName}",
        trade_name: "${d.tradeName}",
        status: "${d.gstinStatus}",
      },
      maskedFields: {
        gstin: "${d.gstin.slice(0, 2)}*****${d.gstin.slice(-3)}",
        legal_name: "${d.legalName}",
        status: "${d.gstinStatus}",
      },
      confidence: ${d.isBlurred ? 0.45 : 0.97},
    },
${udyamBlock}
    signatory_id: {
      filename: "${k}_signatory_id.png",
      docType: "signatory_id",
      extractedFields: {
        name: "${d.idName}",
        designation: "${d.idDesignation}",
        business_name: "${d.businessName}",
        id_type: "Photo ID",
        id_number: "${d.idNumber}",
        valid_till: "${d.idValidTill}",
      },
      maskedFields: {
        name: "${d.idName}",
        id_number: "${d.idNumber}",
      },
      confidence: 0.96,
    },
    address_proof: {
      filename: "${k}_address_proof.png",
      docType: "address_proof",
      extractedFields: {
        billed_to: "${d.businessName}",
        address: "${d.billAddress}",
        city: "${d.city}",
        date: "${d.billDate}",
        consumer_no: "${d.billConsumerNo}",
        type: "Electricity Bill",
      },
      maskedFields: {
        billed_to: "${d.businessName}",
        address: "${d.billAddress}",
        date: "${d.billDate}",
      },
      confidence: 0.94,
    },
  },`);
  }

  return `const SPECIMEN_DOCS_STORE: Record<string, Record<string, ExtractedDocInfo>> = {\n${parts.join('\n')}\n};`;
}

function generatePresetConfigsCode() {
  const parts = [];
  for (const [k, d] of Object.entries(SPECIMENS_DATA)) {
    // In preset configs:
    // Order GSTIN for K06 is the registered GSTIN (08YKZXS5189L1ZO), while the certificate has 8189
    const orderGstin = d.registeredGstin || d.gstin;
    parts.push(`    ${k}: {
      gstin: "${orderGstin}",
      udyam: "${d.udyamNumber || 'UDYAM-AP-00-1183831'}",
      contactName: "${d.contactName}",
      city: "${d.city}",
      businessName: "${d.businessName}",
    },`);
  }

  return `const PRESET_CONFIGS: Record<
    string,
    { gstin: string; udyam: string; contactName: string; city: string; businessName: string }
  > = {\n${parts.join('\n')}\n  };`;
}

function updatePageTsx() {
  const file = 'src/app/kyc/page.tsx';
  let text = fs.readFileSync(file, 'utf-8');
  const storeCode = generateSpecimenDocsStoreCode();
  const presetCode = generatePresetConfigsCode();

  text = text.replace(/const SPECIMEN_DOCS_STORE:[\s\S]*?\n\};\n/, storeCode + '\n');
  text = text.replace(/const PRESET_CONFIGS:[\s\S]*?\n  \};\n/, presetCode + '\n');
  fs.writeFileSync(file, text, 'utf-8');
  console.log('Updated src/app/kyc/page.tsx');
}

// 5. Update specimen_matrix.test.ts
function updateSpecimenMatrixTest() {
  const file = 'tests/specimen_matrix.test.ts';
  let text = fs.readFileSync(file, 'utf-8');

  // Replace configs object in specimen_matrix.test.ts
  const configsCode = `    const configs: Record<string, { gstin: string; udyam: string; businessName: string; contactName: string; city: string }> = {
${Object.entries(SPECIMENS_DATA).map(([k, d]) => `      ${k}: { gstin: '${d.registeredGstin || d.gstin}', udyam: '${d.udyamNumber || 'UDYAM-AP-00-1183831'}', businessName: '${d.businessName}', contactName: '${d.contactName}', city: '${d.city}' },`).join('\n')}
    };`;

  text = text.replace(/const configs: Record<string, \{ gstin: string; udyam: string; businessName: string; contactName: string; city: string \}> = \{[\s\S]*?\n    \};/, configsCode);

  // Update individual test cases
  text = text.replace(/it\('K01: FAILS on Cancelled GSTIN and Blank Udyam Number'[\s\S]*?city: 'Kochi',\n    \}\);/,
`it('K01: FAILS on Cancelled GSTIN and Blank Udyam Number', async () => {
    const res = await runValidationRules('K01', {
      gstin: '37IHKXV5167L1ZS',
      udyam: 'UDYAM-AP-00-1183831',
      businessName: 'Vindhya Tours & Travels',
      contactName: 'Neha Kaur',
      city: 'Visakhapatnam',
    });`);

  text = text.replace(/it\('K02: WARN on Slanted Photo[\s\S]*?city: 'Ludhiana',\n    \}\);/,
`it('K02: WARN on Slanted Photo (Auto-deskew applied, soft notice)', async () => {
    const res = await runValidationRules('K02', {
      gstin: '19EOGXH4115Y1ZL',
      udyam: 'UDYAM-WB-00-5053330',
      businessName: 'Harmony Dental Care',
      contactName: 'Joseph Shah',
      city: 'Kolkata',
    });`);

  text = text.replace(/it\('K03: Clean Baseline — PASS[\s\S]*?city: 'Chennai',\n    \}\);/,
`it('K03: Clean Baseline — PASS (All checks pass)', async () => {
    const res = await runValidationRules('K03', {
      gstin: '27XUIXG0767D1ZP',
      udyam: 'UDYAM-MH-00-9516696',
      businessName: 'Ganesh Woodcraft',
      contactName: 'Joseph Singh',
      city: 'Nagpur',
    });`);

  text = text.replace(/it\('K04: FAILS \/ Soft Re-upload on Blurred GST Certificate'[\s\S]*?city: 'Nagpur',\n    \}\);/,
`it('K04: FAILS / Soft Re-upload on Blurred GST Certificate', async () => {
    const res = await runValidationRules('K04', {
      gstin: '27PZSXS1936O1ZH',
      udyam: 'UDYAM-MH-00-6131836',
      businessName: 'Saffron Dental Care LLP',
      contactName: 'Fatima Pillai',
      city: 'Nagpur',
    });`);

  text = text.replace(/it\('K05: FAILS on Missing Udyam Certificate[\s\S]*?city: 'Kochi',\n    \}\);/,
`it('K05: FAILS on Missing Udyam Certificate (only 3 documents uploaded)', async () => {
    const res = await runValidationRules('K05', {
      gstin: '32TZAXB5481U1Z1',
      udyam: 'UDYAM-KL-00-5521886',
      businessName: 'Balaji Realty LLP',
      contactName: 'Anita Shah',
      city: 'Kochi',
    });`);

  text = text.replace(/it\('K06: FAILS on GSTIN Character Tampering[\s\S]*?city: 'Faridabad',\n    \}\);/,
`it('K06: FAILS on GSTIN Character Tampering (Digit 8 instead of 5)', async () => {
    const res = await runValidationRules('K06', {
      gstin: '08YKZXS5189L1ZO',
      udyam: 'UDYAM-RJ-00-6577157',
      businessName: 'Saffron Unisex Salon',
      contactName: 'Pooja Shah',
      city: 'Jaipur',
    });`);

  text = text.replace(/it\('K07: FAILS on Entity Name Mismatch[\s\S]*?city: 'Lucknow',\n    \}\);/,
`it('K07: FAILS on Entity Name Mismatch (Shri Physio Clinic vs Neelgiri Physio Clinic)', async () => {
    const res = await runValidationRules('K07', {
      gstin: '07CPCXN0398P1ZT',
      udyam: 'UDYAM-DL-00-9565547',
      businessName: 'Neelgiri Physio Clinic',
      contactName: 'Neha Banerjee',
      city: 'Delhi',
    });`);

  text = text.replace(/it\('K08: Clean Baseline — PASS[\s\S]*?city: 'Kolkata',\n    \}\);/,
`it('K08: Clean Baseline — PASS (All checks pass)', async () => {
    const res = await runValidationRules('K08', {
      gstin: '24XORXG9365M1Z3',
      udyam: 'UDYAM-GJ-00-8477445',
      businessName: 'Green Leaf Legal Associates',
      contactName: 'Joseph Rao',
      city: 'Vadodara',
    });`);

  text = text.replace(/it\('K09: Clean Baseline — PASS[\s\S]*?city: 'Ahmedabad',\n    \}\);/,
`it('K09: Clean Baseline — PASS (All checks pass)', async () => {
    const res = await runValidationRules('K09', {
      gstin: '37LDYXK0296F1ZB',
      udyam: 'UDYAM-AP-00-9751562',
      businessName: 'Kaveri Insurance Advisors',
      contactName: 'Anita Kulkarni',
      city: 'Visakhapatnam',
    });`);

  text = text.replace(/it\('K10: FAILS on Signatory Authorization Mismatch[\s\S]*?city: 'Bengaluru',\n    \}\);/,
`it('K10: FAILS on Signatory Authorization Mismatch (Nisha Arora vs Fatima Menon)', async () => {
    const res = await runValidationRules('K10', {
      gstin: '27QHJXK0658U1ZL',
      udyam: 'UDYAM-MH-00-7183141',
      businessName: 'Kaveri Stays LLP',
      contactName: 'Fatima Menon',
      city: 'Mumbai',
    });`);

  text = text.replace(/it\('K11: FAILS on Expired Utility Bill[\s\S]*?city: 'Hyderabad',\n    \}\);/,
`it('K11: FAILS on Expired Utility Bill (257 days old > 90-day limit)', async () => {
    const res = await runValidationRules('K11', {
      gstin: '03KGZXT1320R1ZZ',
      udyam: 'UDYAM-PB-00-9719478',
      businessName: 'Trinity Bake House Pvt Ltd',
      contactName: 'Vikram Pillai',
      city: 'Ludhiana',
    });`);

  text = text.replace(/it\('K12: Clean Baseline — PASS[\s\S]*?city: 'Jaipur',\n    \}\);/,
`it('K12: Clean Baseline — PASS (All checks pass)', async () => {
    const res = await runValidationRules('K12', {
      gstin: '37NBLXS1145E1ZU',
      udyam: 'UDYAM-AP-00-5186772',
      businessName: 'Star Electronics',
      contactName: 'Pooja Agarwal',
      city: 'Visakhapatnam',
    });`);

  fs.writeFileSync(file, text, 'utf-8');
  console.log('Updated tests/specimen_matrix.test.ts');
}

updateExtractTs();
updatePageTsx();
updateSpecimenMatrixTest();
