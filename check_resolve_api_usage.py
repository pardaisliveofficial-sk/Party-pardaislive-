import os, re

files = []
for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if "resolveApiUrl" in content:
                    files.append(path)

print("Files using resolveApiUrl:")
for f in sorted(files):
    print("  ", f)
