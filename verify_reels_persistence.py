
from pathlib import Path
s = Path("server.ts").read_text(encoding="utf-8")
checks = [
    'ListObjectsV2Command',
    'persistReelMetadataToR2',
    'hydrateReelsFromR2Metadata',
    'Prefix: "reels/_metadata/"',
    'await syncDocument("reels", newReel.id, newReel);',
    'await persistReelMetadataToR2(newReel);',
]
for c in checks:
    assert c in s, c
print("PASS: durable R2 reel mirror and Firestore write checks are present.")
