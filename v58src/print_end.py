import subprocess

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

print(f"Total lines in App.tsx: {len(lines)}")

# Let's inspect the last 30 lines line by line
for i in range(len(lines) - 30, len(lines)):
    print(f"{i+1}: {lines[i]}", end='')
