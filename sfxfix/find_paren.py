with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

diff = 0
for i in range(8138, len(lines)):
    line = lines[i]
    o = line.count('(')
    c = line.count(')')
    old_diff = diff
    diff += (o - c)
    if diff == 0:
        print(f"Diff hit 0 at line {i+1}: {line.strip()[:60]}")
    elif diff < 0:
        print(f"Diff went negative at line {i+1}: {line.strip()[:60]}")
