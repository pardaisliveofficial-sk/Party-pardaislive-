import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Let's count occurrences of `{`, `}`, `(`, `)`, `<`, `>`
open_curly = 0
close_curly = 0
open_paren = 0
close_paren = 0

for i, line in enumerate(lines):
    open_curly += line.count('{')
    close_curly += line.count('}')
    open_paren += line.count('(')
    close_paren += line.count(')')

print(f"Curly braces: {{ = {open_curly}, }} = {close_curly}, diff = {open_curly - close_curly}")
print(f"Parens: ( = {open_paren}, ) = {close_paren}, diff = {open_paren - close_paren}")
