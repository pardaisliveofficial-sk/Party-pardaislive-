import os, re

fetch_files = {}

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                matches = re.findall(r'fetch\s*\(\s*[`\'"](/api/[^`\'"]+)[`\'"]', content)
                if matches:
                    fetch_files[path] = matches

print(f"Total files with relative /api/ fetch calls: {len(fetch_files)}")
for path, matches in sorted(fetch_files.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"{path}: {len(matches)} calls (examples: {matches[:3]})")
