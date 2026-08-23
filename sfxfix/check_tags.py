with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

import re

# Let's count JSX opening tags vs closing tags line by line
tag_stack = []

# Simple regex for opening and closing JSX tags
tag_pattern = re.compile(r'</?([a-zA-Z0-9_.-]+)[^>]*>')

for line_idx, line in enumerate(lines):
    # ignore comments
    clean_line = re.sub(r'//.*', '', line)
    clean_line = re.sub(r'\{/\*.*?\*/\}', '', clean_line)
    
    for match in tag_pattern.finditer(clean_line):
        full_tag = match.group(0)
        tag_name = match.group(1)
        
        if full_tag.endswith('/>') or full_tag.startswith('<?'):
            # self-closing tag
            continue
        elif full_tag.startswith('</'):
            # closing tag
            if tag_stack:
                last_tag, last_line = tag_stack[-1]
                if last_tag == tag_name:
                    tag_stack.pop()
                else:
                    if line_idx > 30750:
                        print(f"Mismatched closing tag </{tag_name}> at line {line_idx+1}, expected </{last_tag}> (opened at line {last_line})")
            else:
                if line_idx > 30750:
                    print(f"Extra closing tag </{tag_name}> at line {line_idx+1}")
        else:
            # opening tag
            tag_stack.append((tag_name, line_idx+1))

print("Remaining tags in stack after line 31128:")
for t, l in tag_stack[-15:]:
    print(f"  <{t}> opened at line {l}")
