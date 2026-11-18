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
TOPICS_FILE = ROOT / 'content' / 'topics.json'
WORDCLOUD_FILE = ROOT / 'content' / 'wordcloud.json'
WORDCLOUD_OUTPUT = ROOT / 'data' / 'wordcloud.json'

TOPICS = {'neuroscience', 'computer-science', 'history', 'neuroengineering', 'education', 'brain-modelling', 'machine-learning', 'eeg', 'neuroimaging', 'cerebellum', 'cognitive-decline', 'schizophrenia', 'brain-stimulation', 'spiking-networks', 'dopamine', 'neurodevelopment', 'other'}

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
        raw_bibtex = content[m.start():cursor].strip()
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
        records.append({'key': key, 'entry_type': entry_type, **fields, '__bibtex': raw_bibtex})
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


def infer_topics(entry: dict[str, str]) -> list[str]:
    """Conservative fallback for NEW entries without curated topic assignments.

    Existing works are explicitly tagged in content/topics.json. Review new
    assignments; automatic keyword classification is not a scientific taxonomy.
    """
    t = tex_to_text(' '.join(entry.get(k, '') for k in ('title','journal','booktitle','keywords'))).casefold()
    found = []
    if re.search(r'(neuro\w*|brain\w*|cerebell\w*|\beeg\b|\btms\b|\bfmri\b|\bmri\b|cortical|neural|parkinson\w*|alzheimer\w*|dementia|schizophren\w*|epilep\w*|dopamin\w*|cogniti\w*|synapti\w*|microstates|ataxia|visual cortex|basal ganglia)', t):
        found.append('neuroscience')
    if re.search(r'algorithm|artificial intelligence|machine learning|digital twins?|fuzzy|clusters?|computational|numerical|simulat|spiking|neuromorph|neural network|network model|random matrix|deep learning',t):
        found.append('computer-science')
    if re.search(r'digital twins?|spiking|neuromorph|simulat|computational model|virtual brain|mechanistic model',t):
        found.append('brain-modelling')
    if re.search(r'\btms\b|stimulation|dosimetry|brain-computer interface|artifact correction',t):
        found.append('neuroengineering')
    if re.search(r'\bhistor(y|ical)\b|biograph|pioneer',t):
        found.append('history')
    if re.search(r'education|outreach|train(?:ing)? researchers|teaching|learning programme',t):
        found.append('education')
    if re.search(r'machine learning|artificial intelligence|soft classif|cluster|fuzzy|competitive learning|k-means',t):
        found.append('machine-learning')
    if re.search(r'\beeg\b|electrophysiol|event.related potential|\berps?\b|\bp300\b|microstates',t):
        found.append('eeg')
    if re.search(r'\bfmri\b|functional mri|neuroimag|neuroradiolog|brain atlas',t):
        found.append('neuroimaging')
    if re.search(r'cerebell|deep nuclei|saccadic dysmetria',t):
        found.append('cerebellum')
    if re.search(r'alzheimer|dementia|cognitive decline|subjective cognitive|mild cognitive impairment|\bmci\b|\bscd\b',t):
        found.append('cognitive-decline')
    if re.search(r'schizophren|psychosis',t):
        found.append('schizophrenia')
    if re.search(r'\btms\b|rtms|transcranial|brain stimulation',t):
        found.append('brain-stimulation')
    if re.search(r'spiking|neuromorph|bump attractor',t):
        found.append('spiking-networks')
    if re.search(r'dopamin|parkinson|basal ganglia|antipsychotic',t):
        found.append('dopamine')
    if re.search(r'neurodevelop|autism|epilep|\bscn1a\b|\bgrin\b',t):
        found.append('neurodevelopment')
    return list(dict.fromkeys(found)) or ['other']


def assigned_topics(entry: dict[str, str], topic_overrides: dict) -> list[str]:
    tags = topic_overrides.get(entry['key'])
    if tags is None:
        return infer_topics(entry)
    if not isinstance(tags, list) or not tags or any(t not in TOPICS for t in tags):
        raise ValueError('Invalid topic list for BibTeX key: ' + entry['key'])
    return list(dict.fromkeys(tags))


def normalize(entry: dict[str, str], overrides: dict, topic_overrides: dict) -> dict:
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
        'bibtex': entry['__bibtex'],
        'topics': assigned_topics(entry, topic_overrides),
    }
    return item



def build_wordcloud(items: list[dict]) -> None:
    """Build an editable, clickable research word cloud from the bibliography.

    The weight of each concept is the number of distinct matching records,
    not raw text frequency. A work can belong to several concepts.
    """
    if not WORDCLOUD_FILE.exists():
        raise FileNotFoundError('Missing word cloud specification: ' + str(WORDCLOUD_FILE))
    config = json.loads(WORDCLOUD_FILE.read_text(encoding='utf-8'))
    concepts = config.get('concepts', [])
    if not isinstance(concepts, list) or not concepts:
        raise ValueError('Word cloud must contain a nonempty concepts list')
    seen = set()
    for item in items:
        item['keywords'] = []
    output = []
    for concept in concepts:
        key = concept['id']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key) or key in seen:
            raise ValueError('Invalid or duplicate word cloud id: ' + str(key))
        seen.add(key)
        label = concept['label']
        topic_codes = set(concept.get('topics', []))
        if topic_codes - TOPICS:
            raise ValueError('Unknown topic codes for keyword: ' + key)
        pattern = re.compile(concept.get('pattern', r'(?!)'), flags=re.I)
        match_count = 0
        for item in items:
            searchable_content = ' '.join(str(item.get(k, '')) for k in ('title', 'venue'))
            if topic_codes.intersection(item.get('topics', [])) or pattern.search(searchable_content):
                item['keywords'].append(key)
                match_count += 1
        if match_count:
            output.append({'id': key, 'label': label, 'count': match_count})
    output.sort(key=lambda c: (-c['count'], c['label'].casefold()))
    WORDCLOUD_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    WORDCLOUD_OUTPUT.write_text(json.dumps({'items': output}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Word cloud:', len(output), 'terms linked to', len(items), 'bibliographic records')


def main() -> int:
    entries = parse_bib(BIB.read_text(encoding='utf-8'))
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding='utf-8')) if OVERRIDES_FILE.exists() else {}
    topic_overrides = json.loads(TOPICS_FILE.read_text(encoding='utf-8')) if TOPICS_FILE.exists() else {}
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
    normalized = [normalize(e, overrides, topic_overrides) for e in unique.values() if e['entry_type'] in KIND]
    if not normalized:
        raise ValueError('No publications were parsed from BibTeX')
    normalized.sort(key=lambda p: (-p['year'], {'journal': 0, 'preprint': 1, 'conference': 2, 'thesis': 3}[p['type']], p['title'].lower()))
    not_found = set(topic_overrides) - set(unique)
    if not_found:
        print('WARNING: topic metadata has unused keys: ' + ', '.join(sorted(not_found)), file=sys.stderr)
    build_wordcloud(normalized)
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
