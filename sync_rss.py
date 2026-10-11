#!/usr/bin/env python3
"""
GEEK FACTORY — Synchronisation Automatique du Flux RSS
Extrait les articles publiés sur actualites.html (et les pages article-*.html)
pour générer un flux rss.xml 100% à jour et conforme RSS 2.0.
"""

import os
import re
import sys
import time
import datetime
import html
from pathlib import Path

# Fix Windows console encoding if needed
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "https://geek-factory.xyz"
MONTHS_FR = {
    "janvier": 1, "fevrier": 2, "février": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "aout": 8, "août": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12, "décembre": 12
}

def parse_french_date(date_str: str) -> datetime.datetime:
    """Convertit une chaîne de date française (ex: '10 Octobre 2026' ou 'Septembre 2026') en datetime."""
    now = datetime.datetime.now(datetime.timezone.utc)
    if not date_str:
        return now

    date_clean = date_str.lower().strip()
    
    # Format: "10 Octobre 2026"
    match_full = re.search(r"(\d{1,2})\s+([a-zà-ÿ]+)\s+(\d{4})", date_clean)
    if match_full:
        day = int(match_full.group(1))
        month_name = match_full.group(2)
        year = int(match_full.group(3))
        month = MONTHS_FR.get(month_name, 1)
        return datetime.datetime(year, month, day, 12, 0, 0, tzinfo=datetime.timezone.utc)
    
    # Format: "Septembre 2026"
    match_month = re.search(r"([a-zà-ÿ]+)\s+(\d{4})", date_clean)
    if match_month:
        month_name = match_month.group(1)
        year = int(match_month.group(2))
        month = MONTHS_FR.get(month_name, 1)
        return datetime.datetime(year, month, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)
    
    return now

def format_rfc822(dt: datetime.datetime) -> str:
    """Formate une date au standard RSS (RFC 822 / RFC 2822)."""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{days[dt.weekday()]}, {dt.day:02d} {months[dt.month - 1]} {dt.year} {dt.hour:02d}:{dt.minute:02d}:{dt.second:02d} GMT"

def clean_text(raw_html: str) -> str:
    """Supprime les balises HTML et décode les entités."""
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = html.unescape(text)
    return " ".join(text.split())

def extract_articles(directory: Path):
    """Extrait la liste ordonnée des articles à partir de actualites.html."""
    actualites_file = directory / "actualites.html"
    if not actualites_file.exists():
        print(f"[!] Erreur: {actualites_file} n'existe pas.")
        return []

    content = actualites_file.read_text(encoding="utf-8")
    article_blocks = re.findall(r"<article[\s\S]*?</article>", content)
    articles = []

    for block in article_blocks:
        # Titre et lien
        h2_match = re.search(r"<h2[\s\S]*?<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)</a>[\s\S]*?</h2>", block)
        if h2_match:
            link = h2_match.group(1).strip()
            title = clean_text(h2_match.group(2))
        else:
            # Fallback h2 direct
            h2_direct = re.search(r"<h2[^>]*>([\s\S]*?)</h2>", block)
            title = clean_text(h2_direct.group(1)) if h2_direct else "Nouvel Article"
            link_match = re.search(r"href=[\"'](article-[^\"']+)[\"']", block)
            link = link_match.group(1).strip() if link_match else "actualites.html"

        # Description (paragraphe de description du bloc article)
        description = ""
        p_match = re.search(r"<p\b(?:\"[^\"]*\"|'[^']*'|[^'\">])*>", block)
        if p_match:
            start_pos = p_match.end()
            end_pos = block.find("</p>", start_pos)
            if end_pos != -1:
                description = clean_text(block[start_pos:end_pos])

        # Catégorie / Badge
        cat_match = re.search(r"<span[^>]*class=[\"'][^\"']*font-bold[^\"']*[\"'][^>]*>([\s\S]*?)</span>", block)
        category = clean_text(cat_match.group(1)) if cat_match else "Actualité"

        # Date
        # Recherche d'un élément date (ex: <span>10 Octobre 2026</span> ou data-fr="...")
        date_match = re.search(r"<span[^>]*>(?:Publié le\s*)?([0-9A-Za-zÀ-ÿ\s]+202\d)</span>", block)
        if not date_match:
            date_match = re.search(r"data-fr=[\"']([0-9A-Za-zÀ-ÿ\s]+202\d)[\"']", block)
        date_str = date_match.group(1).strip() if date_match else ""
        dt = parse_french_date(date_str)

        # URL Absolue
        if link.startswith("http://") or link.startswith("https://"):
            full_url = link
        else:
            full_url = f"{BASE_URL}/{link.lstrip('/')}"

        articles.append({
            "title": title,
            "link": full_url,
            "guid": full_url,
            "description": description,
            "category": category,
            "pub_date": format_rfc822(dt),
            "timestamp": dt.timestamp()
        })

    # Trier les articles du plus récent au plus ancien
    articles.sort(key=lambda x: x["timestamp"], reverse=True)
    return articles

def generate_rss_xml(articles, directory: Path) -> Path:
    """Génère le fichier rss.xml à la racine du site."""
    now_rfc822 = format_rfc822(datetime.datetime.now(datetime.timezone.utc))
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        '    <title>GEEK FACTORY — Actualités &amp; Nouveautés</title>',
        f'    <link>{BASE_URL}/actualites.html</link>',
        '    <description>Suivez les dernières sorties de projets, les annonces techniques et les évolutions de l\'écosystème GEEK FACTORY.</description>',
        '    <language>fr-CA</language>',
        f'    <lastBuildDate>{now_rfc822}</lastBuildDate>',
        f'    <atom:link href="{BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />',
        '    <copyright>Copyright © 2026 GEEK FACTORY</copyright>',
        '    <image>',
        f'      <url>{BASE_URL}/logo.png</url>',
        '      <title>GEEK FACTORY</title>',
        f'      <link>{BASE_URL}/</link>',
        '    </image>'
    ]

    for art in articles:
        safe_title = html.escape(art["title"])
        safe_desc = html.escape(art["description"])
        safe_cat = html.escape(art["category"])
        xml_lines.extend([
            '    <item>',
            f'      <title>{safe_title}</title>',
            f'      <link>{art["link"]}</link>',
            f'      <guid isPermaLink="true">{art["guid"]}</guid>',
            f'      <pubDate>{art["pub_date"]}</pubDate>',
            f'      <category>{safe_cat}</category>',
            f'      <description>{safe_desc}</description>',
            '    </item>'
        ])

    xml_lines.extend([
        '  </channel>',
        '</rss>',
        ''
    ])

    rss_path = directory / "rss.xml"
    rss_path.write_text("\n".join(xml_lines), encoding="utf-8")
    return rss_path

def sync():
    """Exécute une passe de synchronisation."""
    dir_path = Path(__file__).resolve().parent
    articles = extract_articles(dir_path)
    if not articles:
        print("[-] Aucun article trouve.")
        return 0
    rss_file = generate_rss_xml(articles, dir_path)
    print(f"[OK] Flux RSS synchronise avec succes : {len(articles)} articles indexes dans {rss_file.name}")
    for a in articles:
        print(f"    * {a['title']} ({a['category']}) -> {a['link']}")
    return len(articles)

def watch_mode():
    """Mode surveillance continu : régénère rss.xml dès que actualites.html ou un article change."""
    dir_path = Path(__file__).resolve().parent
    print("[*] Mode surveillance actif. Modification détectée -> synchronisation automatique de rss.xml...")
    sync()
    
    last_mtimes = {}
    while True:
        try:
            files_to_watch = list(dir_path.glob("actualites.html")) + list(dir_path.glob("article-*.html"))
            changed = False
            for f in files_to_watch:
                mtime = f.stat().st_mtime
                if f not in last_mtimes or mtime > last_mtimes[f]:
                    last_mtimes[f] = mtime
                    changed = True
            
            if changed:
                print(f"[*] Changement détecté dans les articles à {datetime.datetime.now().strftime('%H:%M:%S')}...")
                sync()
            time.sleep(2)
        except KeyboardInterrupt:
            print("\nArrêt de la surveillance.")
            break
        except Exception as e:
            print(f"[!] Erreur: {e}")
            time.sleep(2)

if __name__ == "__main__":
    if "--watch" in sys.argv:
        watch_mode()
    else:
        sync()
