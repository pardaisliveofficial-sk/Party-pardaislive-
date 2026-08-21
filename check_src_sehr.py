import os

matches = []

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if "sehr" in content.lower():
                    for lno, line in enumerate(content.splitlines(), 1):
                        if "sehr" in line.lower():
                            matches.append((path, lno, line.strip()))

# check server.ts
if os.path.exists("server.ts"):
    with open("server.ts", "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        if "sehr" in content.lower():
            for lno, line in enumerate(content.splitlines(), 1):
                if "sehr" in line.lower():
                    matches.append(("server.ts", lno, line.strip()))

print(f"Total occurrences in src and server.ts: {len(matches)}")
for path, lno, line in matches:
    print(f"{path}:{lno}: {line}")
