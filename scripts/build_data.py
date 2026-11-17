#!/usr/bin/env python3
"""Build a GitHub Pages-ready publication feed from the CV's BibTeX.

No third-party Python packages are required. Supports nested BibTeX fields,
plain/quoted/braced values, and common LaTeX accents and formatting commands.

This script does not infer peer-review status from a venue name: types and
statuses stay distinct, with explicit per-entry overrides in content/status.json.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
BIB = ROOT / 'vergani_scholar.bib'
OUT = ROOT / 'data' / 'publications.json'
OVERRIDES_FILE = ROOT / 'content' / 'status.json'

KIND = {
    'article': 'journal',
    'inproceedings': 'conference',
    'misc': 'preprint',
    'thesis': 'thesis',
    'phdthesis': 'thesis',
    'mastersthesis': 'thesis',
    'bachelorsthesis': 'thesis',
    'unpublished': 'preprint',
}

ACCENTS = {'"': '\u0308', "'": '\u0301', '`': '\u0300', '^': '\u0302', '~': '\u0303', 'c': '\u0327', 'v': '\u030c', '=': '\u0304', '.': '\u0307', 'u': '\u0306', 'H': '\u030b', 'r': '\u030a'}
SPECIALS = {
    r'\&': '&', r'\%': '%', r'\_': '_', r'\#': '#', r'\$': '$',
    r'\ae': 'æ', r'\AE': 'Æ', r'\oe': 'œ', r'\OE': 'Œ', r'\aa': 'å',
    r'\AA': 'Å', r'\o': 'ø', r'\O': 'Ø', r'\ss': 'ß', r'\l': 'ł',
    r'\L': 'Ł', r'\textendash': '–', r'\textemdash': '—',
    r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\mu': 'μ',
}


def skip_space(s: str, i: int) -> int:
    while i < len(s):
        if s[i].isspace() or s[i] == ',':
            i += 1
        elif s[i] == '%' and (i == 0 or s[i - 1] != '\\'):
            i = s.find('\n', i)
            if i == -1:
                return len(s)
        else:
            break
    return i


def consume_braces(s: str, i: int, op: str = '{', cl: str = '}') -> tuple[str, int]:
    assert s[i] == op
    depth = 1
    start = i + 1
    i += 1
    while i < len(s):
        if s[i] == '\\':
            i += 2
            continue
        if s[i] == op:
            depth += 1
        elif s[i] == cl:
            depth -= 1
            if depth == 0:
                return s[start:i], i + 1
        i += 1
    raise ValueError('Unbalanced BibTeX braces')


def consume_value(s: str, i: int) -> tuple[str, int]:
    i = skip_space(s, i)
    if i >= len(s):
        return '', i
    if s[i] == '{':
        return consume_braces(s, i)
    if s[i] == '"':
        i += 1
        start = i
        while i < len(s):
            if s[i] == '\\':
                i += 2
            elif s[i] == '"':
                return s[start:i], i + 1
            else:
                i += 1
        raise ValueError('Unbalanced quoted BibTeX value')
    start = i
    while i < len(s) and s[i] not in ',\n}':
        i += 1
    return s[start:i].strip(), i


def parse_bib(content: str) -> list[dict[str, str]]:
    records = []
    pattern = re.compile(r'@([a-zA-Z]+)\s*\{')
    cursor = 0
    while m := pattern.search(content, cursor):
        entry_type = m.group(1).lower()
        body, cursor = consume_braces(content, m.end() - 1)
        if entry_type in ('comment', 'preamble', 'string'):
            continue
        comma = body.find(',')
        if comma < 0:
            continue
        key = body[:comma].strip()
        fields = {}
        i = comma + 1
        while i < len(body):
            i = skip_space(body, i)
            if i >= len(body):
                break
            fm = re.match(r'([\w-]+)\s*=', body[i:])
            if not fm:
                # Skip unexpected comments or dangling formatting without crashing.
                i += 1
                continue
            field = fm.group(1).lower()
            i += fm.end()
            val, i = consume_value(body, i)
            fields[field] = val
        records.append({'key': key, 'entry_type': entry_type, **fields})
    return records


def tex_to_text(value: str) -> str:
    """Human-readable TeX to Unicode, preserving bibliographic content."""
    if not value:
        return ''
    s = str(value)
    # Unwrap formatting commands without discarding their arguments.
    for cmd in ('textbf', 'textit', 'emph', 'textsc', 'texttt', 'textrm', 'textsf', 'underline', 'mathrm', 'mathbf'):
        s = re.sub(r'\\' + cmd + r'\s*\{', '{', s)
    # TeX accents, including \'{e}, \'e, and {\\\'e} forms.
    def accent_repl(m: re.Match) -> str:
        symbol, letter = m.group(1), m.group(2)
        return unicodedata.normalize('NFC', letter + ACCENTS[symbol])
    s = re.sub(r"""\\(["'`^~cv=.uHr])\s*\{?([A-Za-z])\}?""", accent_repl, s)
    for k in sorted(SPECIALS, key=len, reverse=True):
        s = s.replace(k, SPECIALS[k])
    s = s.replace('\\ ', ' ').replace('~', ' ').replace('---', '—').replace('--', '–')
    # Preserve math as text without publishing raw TeX markup.
    s = s.replace('$', '')
    s = re.sub(r'\\(?:url|href)\s*\{([^{}]+)\}', r'\1', s)
    # Brace-based title capitalization has no meaning on the website.
    s = s.replace('{', '').replace('}', '')
    s = re.sub(r'\\([a-zA-Z]+)', r'\1', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def human_authors(raw: str) -> str:
    if not raw:
        return ''
    people = re.split(r'\s+and\s+', raw, flags=re.I)
    out = []
    for person in people:
        p = tex_to_text(person).strip()
        if p.lower() == 'others':
            out.append('et al.')
        elif ',' in p:
            # Family, Given -> Given Family. A light touch is safer than
            # automatically abbreviating already-initialled names.
            parts = [x.strip() for x in p.split(',')]
            out.append((parts[1] + ' ' + parts[0]).strip() if len(parts) > 1 else p)
        else:
            out.append(p)
    return ', '.join(out)


def safe_link(url: str) -> str:
    u = tex_to_text(url).strip()
    return u if u.lower().startswith(('https://', 'http://')) else ''


def normalize(entry: dict[str, str], overrides: dict) -> dict:
    typ = entry['entry_type']
    kind = KIND.get(typ, 'other')
    year_str = tex_to_text(entry.get('year', ''))
    ym = re.search(r'\b(19|20)\d{2}\b', year_str)
    year = int(ym.group()) if ym else 0
    doi = tex_to_text(entry.get('doi', '')).replace('https://doi.org/', '').replace('http://dx.doi.org/', '').strip()
    doi_link = 'https://doi.org/' + doi if re.match(r'^10\.\d{4,9}/\S+$', doi) else ''
    # Prefer an explicit publisher/article URL, or canonical DOI if not provided.
    url = safe_link(entry.get('url', '')) or doi_link
    note = tex_to_text(entry.get('note', ''))
    low_note = note.casefold()
    if kind == 'journal':
        if 'accepted' in low_note or doi.lower() == 'accepted':
            status = 'Accepted'
        elif 'in press' in low_note:
            status = 'In press'
        elif 'submitted' in low_note or 'under review' in low_note:
            status = 'Submitted'
        else:
            status = 'Journal article'
    elif kind == 'conference':
        if 'submitted' in low_note:
            status = 'Submitted abstract'
        elif year > date.today().year:
            status = 'Upcoming / verify status'
        else:
            status = 'Conference abstract'
    elif kind == 'preprint':
        if 'in preparation' in low_note:
            status = 'In preparation'
        elif 'under review' in low_note or 'submitted' in low_note:
            status = 'Under review'
        else:
            status = 'Preprint / working paper'
    elif kind == 'thesis':
        status = 'Thesis'
    else:
        status = 'Other'
    ov = overrides.get(entry['key'], {})
    if isinstance(ov, str):
        ov = {'status': ov}
    title = tex_to_text(entry.get('title', 'Untitled'))
    venue = tex_to_text(ov.get('venue', '') or entry.get('journal', '') or entry.get('booktitle', '') or entry.get('publisher', '') or entry.get('school', '') or entry.get('institution', ''))
    item = {
        'id': entry['key'],
        'type': kind,
        'status': ov.get('status', status),
        'year': year,
        'title': title,
        'authors': human_authors(entry.get('author', '')),
        'venue': venue,
        'doi': doi if doi_link else '',
        'url': safe_link(ov.get('url', '')) or url,
        'note': note,
    }
    return item


def main() -> int:
    entries = parse_bib(BIB.read_text(encoding='utf-8'))
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding='utf-8')) if OVERRIDES_FILE.exists() else {}
    # A CV may have accidental duplicate keys. Deduplicate equivalent entries,
    # but fail on conflicting records rather than silently publishing the wrong one.
    unique = {}
    for e in entries:
        if e['key'] in unique:
            other = unique[e['key']]
            if tex_to_text(e.get('title', '')).casefold() != tex_to_text(other.get('title', '')).casefold():
                raise ValueError('Conflicting BibTeX entries share key: ' + e['key'])
            print('WARNING: duplicate BibTeX key deduplicated: ' + e['key'], file=sys.stderr)
            if len(e.get('doi', '')) < len(other.get('doi', '')):
                continue
        unique[e['key']] = e
    normalized = [normalize(e, overrides) for e in unique.values() if e['entry_type'] in KIND]
    if not normalized:
        raise ValueError('No publications were parsed from BibTeX')
    normalized.sort(key=lambda p: (-p['year'], {'journal': 0, 'preprint': 1, 'conference': 2, 'thesis': 3}[p['type']], p['title'].lower()))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'items': normalized}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    from collections import Counter
    print('Built', OUT.relative_to(ROOT), 'with', len(normalized), 'items:', dict(Counter(p['type'] for p in normalized)))
    missing = [p['id'] for p in normalized if not p['title'] or not p['year']]
    if missing:
        print('WARNING: entries requiring metadata review:', ', '.join(missing), file=sys.stderr)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
