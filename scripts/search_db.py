import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
for word in ['Sunrise', 'Bansal', 'Shah', 'Verma', 'Royal', 'Star', 'Zenith', 'Patel']:
    c.execute("SELECT gstin, legal_name, status, state FROM gstin_records WHERE legal_name LIKE ? LIMIT 2", ('%' + word + '%',))
    print(word, '->', c.fetchall())
