"""Build step: convert text sizes in css/styles.css from px to rem (17px root) so text follows Dynamic Type.
Fixed-size boxes (club rail, hole strip, badges, tab bar) and SVG drawings keep px. Safe to run more than once."""
import re, pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'css' / 'styles.css'
SKIP = ('.t-', 'svg', ' text', '.ic', '.tabbar', '.rail-club', '.hs', '.wu-num', '.cad-n', '.p9-', '.shape-cell .tag', '.wu-frame .n', '.type-chip', '.verdict', ':root', 'html', 'input[type=range]')
def rem(px): v = float(px) / 17; return ('%.4f' % v).rstrip('0').rstrip('.') + 'rem'
def conv_decls(d):
    d = re.sub(r'(font-size:\s*)(\d+(?:\.\d+)?)px', lambda m: m.group(1) + rem(m.group(2)), d)
    def font(m):
        val = m.group(2)
        if 'clamp' in val or 'var(' in val.split(' ')[0]: pass
        val = re.sub(r'(?<![\w(,-])(\d+(?:\.\d+)?)px(?=(?:/[\d.]+)?\s)', lambda k: rem(k.group(1)), val, count=1)
        return m.group(1) + val
    d = re.sub(r'(\bfont:\s*)([^;}]+)', font, d)
    return d
s = P.read_text()
out, n = [], 0
def rule(m):
    global n
    sel, decls = m.group(1), m.group(2)
    if any(k in sel for k in SKIP): return m.group(0)
    new = conv_decls(decls)
    if new != decls: n += 1
    return sel + '{' + new + '}'
s2 = re.sub(r'([^{}]+)\{([^{}]*)\}', rule, s)
P.write_text(s2)
print('rules converted:', n)
