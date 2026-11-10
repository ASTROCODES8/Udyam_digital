import json, sqlite3

matrix = json.load(open('data/kyc_testmatrix.json'))
conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

apps = {}
for fn, item in matrix.items():
    app = item['applicantId']
    if app not in apps:
        apps[app] = {}
    apps[app][item['docType']] = item['extractedFields']

print("=== VERIFIED SPECIMEN DATA FOR ALL APPLICANTS ===")
for app in sorted(apps.keys()):
    gst_cert = apps[app].get('gst_certificate', {})
    udyam_cert = apps[app].get('udyam_certificate', {})
    sig_id = apps[app].get('signatory_id', {})
    addr = apps[app].get('address_proof', {})

    gstin = gst_cert.get('gstin', '')
    c.execute("SELECT status, legal_name FROM gstin_records WHERE gstin = ?", (gstin,))
    db_row = c.fetchone()
    db_status = db_row[0] if db_row else 'NOT_IN_DB'

    print(f"{app}:")
    print(f"  GSTIN: {gstin} (DB: {db_status}) | Legal: {gst_cert.get('legal_name')}")
    print(f"  Udyam: {udyam_cert.get('udyam_number')} | Status: {udyam_cert.get('status')}")
    print(f"  Signatory: {sig_id.get('name')}")
    print(f"  Address: {addr.get('date')} | City: {addr.get('city')}")
