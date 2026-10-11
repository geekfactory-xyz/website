#!/usr/bin/env node
/**
 * GEEK FACTORY — Synchronisation Automatique du Flux RSS (Node.js)
 * Conçu pour s'exécuter dans les environnements de build cloud Vercel & Render (sans dépendance).
 * Analyse actualites.html et génère un flux rss.xml 100% à jour.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://geek-factory.xyz';
const MONTHS_FR = {
  janvier: 0, fevrier: 1, 'février': 1, mars: 2, avril: 3,
  mai: 4, juin: 5, juillet: 6, aout: 7, 'août': 7,
  septembre: 8, octobre: 9, novembre: 10, decembre: 11, 'décembre': 11
};

function parseFrenchDate(dateStr) {
  const now = new Date();
  if (!dateStr) return now;

  const clean = dateStr.toLowerCase().trim();
  
  // Format: "10 Octobre 2026"
  const matchFull = clean.match(/(\d{1,2})\s+([a-zà-ÿ]+)\s+(\d{4})/);
  if (matchFull) {
    const day = parseInt(matchFull[1], 10);
    const month = MONTHS_FR[matchFull[2]] !== undefined ? MONTHS_FR[matchFull[2]] : 0;
    const year = parseInt(matchFull[3], 10);
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  // Format: "Septembre 2026"
  const matchMonth = clean.match(/([a-zà-ÿ]+)\s+(\d{4})/);
  if (matchMonth) {
    const month = MONTHS_FR[matchMonth[1]] !== undefined ? MONTHS_FR[matchMonth[1]] : 0;
    const year = parseInt(matchMonth[2], 10);
    return new Date(Date.UTC(year, month, 1, 12, 0, 0));
  }

  return now;
}

function cleanText(rawHtml) {
  return rawHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractArticles(dir) {
  const actualitesPath = path.join(dir, 'actualites.html');
  if (!fs.existsSync(actualitesPath)) {
    console.error(`[!] Fichier non trouvé: ${actualitesPath}`);
    return [];
  }

  const content = fs.readFileSync(actualitesPath, 'utf-8');
  const articleBlocks = content.match(/<article[\s\S]*?<\/article>/gi) || [];
  const articles = [];

  for (const block of articleBlocks) {
    // Titre et lien
    const h2Match = block.match(/<h2[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
    let title = 'Nouvel Article';
    let link = 'actualites.html';

    if (h2Match) {
      link = h2Match[1].trim();
      title = cleanText(h2Match[2]);
    } else {
      const h2Direct = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      if (h2Direct) title = cleanText(h2Direct[1]);
      const linkMatch = block.match(/href=["'](article-[^"']+)["']/i);
      if (linkMatch) link = linkMatch[1].trim();
    }

    // Description (contenu intérieur de <p>)
    let description = '';
    const pTagMatch = block.match(/<p\b(?:\"[^\"]*\"|'[^']*'|[^'\">])*>/i);
    if (pTagMatch) {
      const startPos = pTagMatch.index + pTagMatch[0].length;
      const endPos = block.toLowerCase().indexOf('</p>', startPos);
      if (endPos !== -1) {
        description = cleanText(block.substring(startPos, endPos));
      }
    }

    // Catégorie
    const catMatch = block.match(/<span[^>]*class=["'][^"']*font-bold[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const category = catMatch ? cleanText(catMatch[1]) : 'Actualité';

    // Date
    let dateStr = '';
    const dateMatch = block.match(/<span[^>]*>(?:Publié le\s*)?([0-9A-Za-zÀ-ÿ\s]+202\d)<\/span>/i)
      || block.match(/data-fr=["']([0-9A-Za-zÀ-ÿ\s]+202\d)["']/i);
    if (dateMatch) dateStr = dateMatch[1].trim();

    const dt = parseFrenchDate(dateStr);
    const fullUrl = link.startsWith('http') ? link : `${BASE_URL}/${link.replace(/^\/+/, '')}`;

    articles.push({
      title,
      link: fullUrl,
      guid: fullUrl,
      description,
      category,
      pubDate: dt.toUTCString(),
      timestamp: dt.getTime()
    });
  }

  // Tri antichronologique
  articles.sort((a, b) => b.timestamp - a.timestamp);
  return articles;
}

function generateRssXml(articles, dir) {
  const now = new Date().toUTCString();
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>GEEK FACTORY — Actualités &amp; Nouveautés</title>',
    `    <link>${BASE_URL}/actualites.html</link>`,
    "    <description>Suivez les dernières sorties de projets, les annonces techniques et les évolutions de l'écosystème GEEK FACTORY.</description>",
    '    <language>fr-CA</language>',
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
    '    <copyright>Copyright © 2026 GEEK FACTORY</copyright>',
    '    <image>',
    `      <url>${BASE_URL}/logo.png</url>`,
    '      <title>GEEK FACTORY</title>',
    `      <link>${BASE_URL}/</link>`,
    '    </image>'
  ];

  for (const art of articles) {
    lines.push(
      '    <item>',
      `      <title>${escapeXml(art.title)}</title>`,
      `      <link>${art.link}</link>`,
      `      <guid isPermaLink="true">${art.guid}</guid>`,
      `      <pubDate>${art.pubDate}</pubDate>`,
      `      <category>${escapeXml(art.category)}</category>`,
      `      <description>${escapeXml(art.description)}</description>`,
      '    </item>'
    );
  }

  lines.push('  </channel>', '</rss>', '');

  const rssPath = path.join(dir, 'rss.xml');
  fs.writeFileSync(rssPath, lines.join('\n'), 'utf-8');
  console.log(`[OK] Flux RSS généré avec succès dans ${rssPath} (${articles.length} articles).`);
}

const dir = __dirname;
const articles = extractArticles(dir);
if (articles.length > 0) {
  generateRssXml(articles, dir);
} else {
  console.log('[-] Aucun article trouvé.');
}
