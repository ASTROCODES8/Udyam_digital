import json

with open('data/kyc_testmatrix.json', 'r') as f:
    d = json.load(f)

char_map = {str(i): i for i in range(10)}
for i in range(26):
    char_map[chr(65+i)] = 10 + i
num_to_char = [str(i) for i in range(10)] + [chr(65+i) for i in range(26)]

def calc_sum(s14):
    tot = 0
    for idx, ch in enumerate(s14):
        v = char_map[ch]
        fac = 1 if (idx % 2 == 0) else 2
        prod = v * fac
        tot += (prod // 36) + (prod % 36)
    rem = tot % 36
    chk = (36 - rem) % 36
    return num_to_char[chk]

for k, v in sorted(d.items()):
    if 'gst_certificate' in k:
        g = v.get('extractedFields', {}).get('gstin', '')
        if len(g) == 15:
            exp = calc_sum(g[:14])
            match = (g[14] == exp)
            print(f"{k}: {g} -> expected '{exp}', actual '{g[14]}', match={match}")
