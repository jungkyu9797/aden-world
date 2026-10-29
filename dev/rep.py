import sys
def apply(path, pairs):
    s = open(path, encoding='utf8').read()
    for i, (a, b, *cnt) in enumerate(pairs):
        n = s.count(a); want = cnt[0] if cnt else 1
        assert n == want, f'pair {i}: found {n} (want {want}): {a[:90]!r}'
        s = s.replace(a, b)
    open(path, 'w', encoding='utf8').write(s)
    print('ok', len(pairs), 'replacements in', path)
