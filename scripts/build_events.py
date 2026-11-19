import json
import re
from datetime import date, datetime
from html import escape
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "content" / "events.json"
OUTPUT = ROOT / "events"


def clean(value):
    return str(value).strip() if value is not None else ""


def text(value):
    return escape(clean(value), quote=True)


def external_link(url, label, class_name="event-link"):
    url = clean(url)
    parsed = urlsplit(url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError(f"Expected an HTTP(S) source URL: {url!r}")
    return (
        f'<a class="{text(class_name)}" href="{text(url)}" target="_blank" '
        f'rel="noopener noreferrer">{text(label)} '
        '<span aria-hidden="true">↗</span>'
        '<span class="sr-only"> (opens in a new tab)</span></a>'
    )


def date_label(value):
    day = date.fromisoformat(value)
    return f"{day.day} {day:%B %Y}"


def time_range(item, event_date):
    start = clean(item.get("start_time"))
    end = clean(item.get("end_time"))
    if not start:
        return ""
    for value in (start, end):
        if value:
            datetime.strptime(value, "%H:%M")
    rendered = f'<time datetime="{text(event_date)}T{text(start)}">{text(start)}</time>'
    if end:
        rendered += f'–<time datetime="{text(event_date)}T{text(end)}">{text(end)}</time>'
    return rendered


def site_header():
    homepage = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r"<header\b[^>]*>.*?</header>", homepage, re.DOTALL | re.IGNORECASE)
    if not match:
        raise ValueError("Could not find the homepage header")

    def relative_href(match):
        quote, href = match.group(1), match.group(2)
        if href.startswith("#"):
            href = "../index.html" + href
        elif not urlsplit(href).scheme and not href.startswith(("/", "../")):
            href = "../" + href
        return f"href={quote}{href}{quote}"

    return re.sub(r'href=([\"\'])(.*?)\1', relative_href, match.group(0))


def facts(event):
    items = []
    if event.get("date"):
        value = f'<time datetime="{text(event["date"])}">{text(date_label(event["date"]))}</time>'
        items.append(("Date", value))
    times = time_range(event, event.get("date", ""))
    if times:
        items.append(("Local time", times))
    place = [clean(event.get(key)) for key in ("venue", "city")]
    place = list(dict.fromkeys(value for value in place if value))
    if place:
        items.append(("Location", "<br>".join(text(value) for value in place)))
    if event.get("room"):
        items.append(("Room", text(event["room"])))
    if not items:
        return ""
    entries = "\n".join(
        f'<div class="event-fact"><dt>{text(label)}</dt><dd>{value}</dd></div>'
        for label, value in items
    )
    return f'<dl class="event-facts">\n{entries}\n</dl>'


def abstract_content(speaker):
    abstract = clean(speaker.get("abstract"))
    source = clean(speaker.get("abstract_source_url"))
    if not abstract:
        return (
            '<div class="event-talk-actions">'
            + external_link(source, "Original abstract")
            + "</div>"
            if source else ""
        )
    paragraphs = "\n".join(
        f"<p>{text(paragraph)}</p>"
        for paragraph in re.split(r"\n\s*\n", abstract) if paragraph.strip()
    )
    attribution = []
    if source:
        attribution.append(external_link(source, "Original abstract"))
    license_name = clean(speaker.get("abstract_license"))
    license_url = clean(speaker.get("abstract_license_url"))
    if license_name:
        attribution.append(
            external_link(license_url, license_name)
            if license_url else text(license_name)
        )
    credits = (
        '<p class="event-abstract-credits">' + " · ".join(attribution) + "</p>"
        if attribution else ""
    )
    return (
        '<details class="event-abstract"><summary>Abstract</summary>'
        f'<div class="event-abstract-body">{paragraphs}{credits}</div></details>'
    )


def speaker_card(speaker, number, event_date):
    times = time_range(speaker, event_date)
    top_line = f'<span class="event-talk-number">Talk {number:02d}</span>'
    if times:
        top_line += f'<span class="event-talk-time">{times}</span>'
    affiliation = (
        f'<p class="event-affiliation">{text(speaker["affiliation"])}</p>'
        if speaker.get("affiliation") else ""
    )
    affiliation_note = clean(speaker.get("affiliation_note"))
    affiliation_source = clean(speaker.get("affiliation_source_url"))
    provenance = []
    if affiliation_note:
        provenance.append(text(affiliation_note))
    if affiliation_source:
        provenance.append(external_link(affiliation_source, "Affiliation source"))
    note = (
        '<p class="event-affiliation-note">' + " ".join(provenance) + "</p>"
        if provenance else ""
    )
    return f'''<li class="event-talk-card">
<article aria-labelledby="talk-{number}">
<div class="event-talk-topline">{top_line}</div>
<h3 id="talk-{number}">{text(speaker["talk_title"])}</h3>
<p class="event-speaker">{text(speaker["name"])}</p>
{affiliation}
{note}
{abstract_content(speaker)}
</article>
</li>'''


def overview_section(event):
    overview = clean(event.get("overview"))
    role_items = []
    for role in event.get("roles", []):
        names = [clean(name) for name in role.get("names", []) if clean(name)]
        if not names:
            continue
        role_names = "".join(f"<span>{text(name)}</span>" for name in names)
        role_items.append(
            f'<div><dt>{text(role.get("label"))}</dt>'
            f'<dd class="event-role-names">{role_names}</dd></div>'
        )
    roles = '<dl class="event-roles">' + "".join(role_items) + "</dl>" if role_items else ""
    session = (
        '<p class="event-session-link">'
        + external_link(event["session_abstract_url"], "Session rationale")
        + "</p>"
        if event.get("session_abstract_url") else ""
    )
    if not (overview or roles or session):
        return ""
    overview_text = f'<p class="event-overview-text">{text(overview)}</p>' if overview else ""
    return f'''<section class="event-overview" aria-labelledby="overview-heading">
<div><h2 id="overview-heading">About the session</h2>{overview_text}{session}</div>
{roles}
</section>'''


def source_section(event):
    sources = event.get("sources", [])
    if not sources:
        return ""
    entries = "\n".join(
        f'<li>{external_link(source["url"], source["title"])}</li>'
        for source in sources
    )
    return f'''<section class="event-sources" aria-labelledby="sources-heading">
<h2 id="sources-heading">Sources</h2>
<ul>{entries}</ul>
</section>'''


def related_section(event, events):
    cards = []
    for other in events:
        if other["id"] == event["id"]:
            continue
        details = " · ".join(clean(other.get(key)) for key in ("series", "kind") if other.get(key))
        cards.append(f'''<a class="event-related-card" href="{text(other["id"])}.html">
<span class="event-related-meta">{text(details)}</span>
<h3>{text(other["title"])}</h3>
<span class="event-related-cta">View session <span aria-hidden="true">→</span></span>
</a>''')
    if not cards:
        return ""
    return f'''<nav class="event-related" aria-labelledby="related-heading">
<h2 id="related-heading">More symposia &amp; workshops</h2>
<div class="event-related-grid">{"".join(cards)}</div>
</nav>'''


def render(event, events, header):
    title = clean(event["title"])
    description = clean(event.get("overview")) or title
    eyebrow = " · ".join(clean(event.get(key)) for key in ("series", "kind") if event.get(key))
    subtitle = f'<p class="event-subtitle">{text(event["subtitle"])}</p>' if event.get("subtitle") else ""
    actions = []
    if event.get("programme_url"):
        actions.append(external_link(event["programme_url"], "Official programme", "event-button event-button-primary"))
    if event.get("official_url"):
        actions.append(external_link(event["official_url"], "Conference website", "event-button"))
    action_html = '<div class="event-actions">' + "".join(actions) + "</div>" if actions else ""
    affiliation_note = (
        f'<p class="event-programme-note">{text(event["affiliation_note"])}</p>'
        if event.get("affiliation_note") else ""
    )
    speakers = event.get("speakers", [])
    speaker_cards = "\n".join(
        speaker_card(speaker, number, event.get("date", ""))
        for number, speaker in enumerate(speakers, 1)
    )
    programme = f'''<section class="event-programme" aria-labelledby="programme-heading">
<div class="event-section-heading"><h2 id="programme-heading">Speakers &amp; talks</h2><span>{len(speakers)} speakers</span></div>
{affiliation_note}
<ol class="event-talk-list">{speaker_cards}</ol>
</section>''' if speakers else ""
    year = date.today().year
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<meta name="description" content="{text(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{text(title)} · {text(event.get("series"))}">
<meta property="og:description" content="{text(description)}">
<title>{text(title)} · {text(event.get("series"))} · Alberto Arturo Vergani</title>
<link href="../assets/favicon.svg" rel="icon" type="image/svg+xml">
<link href="../assets/style.css" rel="stylesheet">
<link href="../assets/events.css" rel="stylesheet">
<script defer src="../assets/main.js"></script>
</head>
<body data-page="event">
<a class="skip-link" href="#main">Skip to content</a>
{header}
<main id="main" class="event-page">
<section class="event-hero" aria-labelledby="event-title">
<div class="container event-container">
<a class="event-back" href="../index.html#recognition"><span aria-hidden="true">←</span> Winning proposals</a>
<p class="eyebrow">{text(eyebrow)}</p>
<h1 id="event-title">{text(title)}</h1>
{subtitle}
{facts(event)}
{action_html}
</div>
</section>
<div class="container event-container event-body">
{overview_section(event)}
{programme}
{source_section(event)}
{related_section(event, events)}
</div>
</main>
<footer class="site-footer"><div class="container footer-inner"><p>© <span id="current-year">{year}</span> Alberto Arturo Vergani. Academic profile.</p><div><a href="../cv.html">Full CV</a><a href="#top">Back to top ↑</a></div></div></footer>
</body>
</html>
'''


def main():
    events = json.loads(INPUT.read_text(encoding="utf-8"))["events"]
    seen = set()
    for event in events:
        event_id = event["id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", event_id) or event_id in seen:
            raise ValueError(f"Invalid or duplicate event id: {event_id!r}")
        if not clean(event.get("title")):
            raise ValueError(f"Event {event_id!r} needs a title")
        seen.add(event_id)
    header = site_header()
    pages = [(event["id"], render(event, events, header)) for event in events]
    OUTPUT.mkdir(exist_ok=True)
    for event_id, page in pages:
        (OUTPUT / f"{event_id}.html").write_text(page, encoding="utf-8")
    print(f"Built {len(pages)} event pages from {INPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
