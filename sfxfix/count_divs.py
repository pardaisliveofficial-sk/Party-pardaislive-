with open('src/App.tsx', 'r') as f:
    content = f.read()

# Let's count open vs close div tags in content
open_divs = content.count('<div')
close_divs = content.count('</div>')

print(f"<div count: {open_divs}")
print(f"</div> count: {close_divs}")
print(f"Difference (open - close): {open_divs - close_divs}")
