with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

import re

for i in range(30850, 31128):
    line = lines[i]
    if 'showGooglePayModal' in line or 'showCardPaymentModal' in line or 'activePaymentMethodTab' in line:
        print(f"Line {i+1}: {line.strip()[:70]}")
