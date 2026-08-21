with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

# Line 31118 is index 31117 in 0-indexed list
print("Line 31118 content:", repr(lines[31117]))

# Insert '                )}\n' after line 31118
lines.insert(31118, '                )}\n')

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)

print("Inserted missing )} after line 31118 successfully!")
