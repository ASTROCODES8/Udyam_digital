import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute("SELECT gstin, legal_name, status FROM gstin_records WHERE gstin = '33MFTXS9954Q1Z9'")
print('GSTIN:', c.fetchall())

c.execute("SELECT udyam_number, enterprise_name FROM udyam_records WHERE udyam_number = 'UDYAM-TN-00-3866196'")
print('UDYAM:', c.fetchall())
