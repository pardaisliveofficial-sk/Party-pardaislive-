import os, re

matches = []

for root, dirs, files in os.walk("."):
    if "node_modules" in root or ".git" in root or "dist" in root:
        continue
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if "sehr" in content.lower():
                    for lno, line in enumerate(content.splitlines(), 1):
                        if "sehr" in line.lower():
                            matches.append((path, lno, line.strip()))
        except Exception:
            pass

print(f"Total lines containing 'sehr': {len(matches)}")
for path, lno, line in matches:
    print(f"{path}:{lno}: {line}")
