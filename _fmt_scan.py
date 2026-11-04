import os, sys

def score(path):
    try:
        lines = open(path, encoding='utf-8').read().splitlines()
    except Exception:
        return None
    code = [l for l in lines if l.strip()]
    if len(code) < 15:
        return None
    blanks = len(lines) - len(code)
    # a normally written file has roughly 1 blank per 4-5 code lines
    return (blanks, len(code), blanks / max(1, len(code)))

hits = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'venv', '__pycache__', 'dist', 'media')]
    for f in files:
        if not f.endswith(('.py', '.jsx', '.js')):
            continue
        p = os.path.join(root, f)
        s = score(p)
        if s and s[2] > 0.55:
            hits.append((round(s[2], 2), p))
hits.sort(reverse=True)
print(f"{len(hits)} files with unusual blank-line density:")
for r, p in hits[:40]:
    print(f"  ratio={r}  {p}")
