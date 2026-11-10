import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute("SELECT lead_id, business_name, contact_name, city, gstin, udyam_number, drop_reason FROM leads WHERE lead_id LIKE 'L000%' LIMIT 12")
for r in c.fetchall():
    print(r)
