import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

# 1. K01: GSTIN Cancelled in official registry
c.execute("""
    UPDATE gstin_records
    SET status = 'Cancelled'
    WHERE gstin = '32TTNXB7384T1ZW'
""")

# 2. K06: Official registered GSTIN has 5189 (active)
c.execute("""
    INSERT INTO gstin_records (gstin, legal_name, trade_name, constitution, state, status, registration_date, principal_place_of_business)
    VALUES ('06ABCXD5189E1ZH', 'Patel Hardware Store', 'Patel Hardware Store', 'Proprietorship', 'Haryana', 'Active', '2020-11-15', '45, Industrial Area, Faridabad, Haryana - 121001')
    ON CONFLICT(gstin) DO UPDATE SET
        legal_name=excluded.legal_name,
        status='Active'
""")

# 3. K07: Official registered name is Neelgiri Physio Clinic
c.execute("""
    INSERT INTO gstin_records (gstin, legal_name, trade_name, constitution, state, status, registration_date, principal_place_of_business)
    VALUES ('09BNZXK5678L1ZQ', 'Neelgiri Physio Clinic', 'Neelgiri Physio Clinic', 'Proprietorship', 'Uttar Pradesh', 'Active', '2021-07-22', 'Plot 12, Sector 5, Lucknow, Uttar Pradesh - 226001')
    ON CONFLICT(gstin) DO UPDATE SET
        legal_name='Neelgiri Physio Clinic',
        trade_name='Neelgiri Physio Clinic',
        status='Active'
""")

# 4. K09: Ensure Ahmedabad Auto Parts has Active status in DB
c.execute("""
    UPDATE gstin_records
    SET status = 'Active'
    WHERE gstin = '24EFGXH3456I1ZN'
""")
c.execute("""
    UPDATE udyam_records
    SET enterprise_name = 'Ahmedabad Auto Parts'
    WHERE udyam_number = 'UDYAM-GJ-00-5432109'
""")

# 5. K10: Lead contact is Fatima Menon
c.execute("""
    INSERT INTO gstin_records (gstin, legal_name, trade_name, constitution, state, status, registration_date, principal_place_of_business)
    VALUES ('29GHIXJ4567K1ZL', 'Bangalore Coffee House', 'Bangalore Coffee House', 'Partnership', 'Karnataka', 'Active', '2017-05-30', '12, Brigade Road, Bengaluru, Karnataka - 560001')
    ON CONFLICT(gstin) DO UPDATE SET status='Active', legal_name='Bangalore Coffee House'
""")

conn.commit()
print("Updated database records successfully!")
