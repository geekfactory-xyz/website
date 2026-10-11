// ==============================================================================
// GEEK FACTORY — Système Bilingue FR / EN Automatique & Outils de Partage
// Traduction automatique intégrale du site (même lors de modifications du texte français)
// ==============================================================================

const instantTranslations = {
  fr: {
    nav_home: "Accueil",
    nav_story: "Notre histoire",
    nav_news: "Actualités",
    nav_projects: "Projets",
    nav_guides: "Guides",
    read_full: "Lire en entier →",
    open_project: "Ouvrir le site-web ↗",
    github_page: "Page GitHub ↗",
    read_guide: "Lire le guide ↗",
    share_copied: "✓ Lien copié !",
    share_title: "Partager l'article :",
    back_news: "← Retour aux actualités",
    published_on: "Publié le"
  },
  en: {
    nav_home: "Home",
    nav_story: "Our Story",
    nav_news: "News",
    nav_projects: "Projects",
    nav_guides: "Guides",
    read_full: "Read full article →",
    open_project: "Open website ↗",
    github_page: "GitHub Page ↗",
    read_guide: "Read guide ↗",
    share_copied: "✓ Link copied!",
    share_title: "Share article:",
    back_news: "← Back to News",
    published_on: "Published on"
  }
};

function getCurrentLang() {
  return localStorage.getItem('gf_lang') || 'fr';
}

function updateToggleButton(lang) {
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) {
    btn.setAttribute('translate', 'no');
    btn.classList.add('notranslate');
    btn.innerHTML = lang === 'fr' 
      ? '<span class="text-white font-bold notranslate" translate="no">FR</span><span class="text-zinc-500 notranslate" translate="no">/</span><span class="text-zinc-400 notranslate" translate="no">EN</span>'
      : '<span class="text-zinc-400 notranslate" translate="no">FR</span><span class="text-zinc-500 notranslate" translate="no">/</span><span class="text-white font-bold notranslate" translate="no">EN</span>';
  }
}

function setGoogTransCookie(value) {
  const host = window.location.hostname;
  document.cookie = `googtrans=${value}; path=/;`;
  if (host && host !== 'localhost') {
    document.cookie = `googtrans=${value}; path=/; domain=${host};`;
    const parts = host.split('.');
    if (parts.length > 1) {
      document.cookie = `googtrans=${value}; path=/; domain=.${parts.slice(-2).join('.')};`;
    }
  }
}

function clearGoogTransCookie() {
  const host = window.location.hostname;
  const past = 'Thu, 01 Jan 1970 00:00:00 UTC';
  document.cookie = `googtrans=; expires=${past}; path=/;`;
  document.cookie = 'googtrans=/fr/fr; path=/;';
  if (host && host !== 'localhost') {
    document.cookie = `googtrans=; expires=${past}; path=/; domain=${host};`;
    document.cookie = `googtrans=/fr/fr; path=/; domain=${host};`;
    const parts = host.split('.');
    if (parts.length > 1) {
      document.cookie = `googtrans=; expires=${past}; path=/; domain=.${parts.slice(-2).join('.')};`;
    }
  }
}

function toggleLang() {
  const current = getCurrentLang();
  const nextLang = current === 'fr' ? 'en' : 'fr';
  setLang(nextLang);
}

function setLang(lang) {
  localStorage.setItem('gf_lang', lang);
  updateToggleButton(lang);

  // Appliquer les textes instantanés
  applyInstantTranslations(lang);

  const combo = document.querySelector('.goog-te-combo');

  if (lang === 'en') {
    setGoogTransCookie('/fr/en');
    if (combo) {
      combo.value = 'en';
      combo.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }
  } else {
    clearGoogTransCookie();
    if (combo) {
      combo.value = 'fr';
      combo.dispatchEvent(new Event('change'));
    }
    window.location.reload();
  }
}

function applyInstantTranslations(lang) {
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (instantTranslations[lang] && instantTranslations[lang][key]) {
      el.innerHTML = instantTranslations[lang][key];
    }
  });

  document.querySelectorAll('[data-fr]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.innerHTML = text;
      }
    }
  });
}

// Initialisation de Google Translate automatique
window.googleTranslateElementInit = function() {
  if (window.google && window.google.translate) {
    new window.google.translate.TranslateElement({
      pageLanguage: 'fr',
      includedLanguages: 'en,fr',
      layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');

    const current = getCurrentLang();
    if (current === 'en') {
      setTimeout(() => {
        const combo = document.querySelector('.goog-te-combo');
        if (combo && combo.value !== 'en') {
          combo.value = 'en';
          combo.dispatchEvent(new Event('change'));
        }
      }, 300);
    }
  }
};

function initAutoTranslation() {
  // 1. Injecter les styles masquant les barres intrusives de Google
  if (!document.getElementById('google-translate-style')) {
    const style = document.createElement('style');
    style.id = 'google-translate-style';
    style.textContent = `
      .goog-te-banner-frame.skiptranslate,
      .goog-te-banner-frame,
      #goog-gt-tt,
      .goog-te-balloon-frame {
        display: none !important;
        visibility: hidden !important;
      }
      body {
        top: 0px !important;
        position: static !important;
      }
      .goog-text-highlight {
        background: none !important;
        box-shadow: none !important;
      }
      #google_translate_element {
        display: none !important;
      }
      .skiptranslate:not(#google_translate_element) {
        display: none !important;
      }
      .notranslate {
        translate: no !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 2. Préparer le conteneur masqué
  if (!document.getElementById('google_translate_element')) {
    const div = document.createElement('div');
    div.id = 'google_translate_element';
    div.style.display = 'none';
    div.setAttribute('translate', 'no');
    div.classList.add('notranslate');
    document.body.appendChild(div);
  }

  // 3. Charger le script officiel Google Website Translator
  if (!document.getElementById('google-translate-script')) {
    const s = document.createElement('script');
    s.id = 'google-translate-script';
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.head.appendChild(s);
  }

  // 4. Synchroniser le cookie avec la préférence enregistrée
  const currentLang = getCurrentLang();
  if (currentLang === 'en') {
    setGoogTransCookie('/fr/en');
  }

  updateToggleButton(currentLang);
  applyInstantTranslations(currentLang);
}

// Outils de Partage pour les articles
function copyArticleLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const feedback = document.getElementById('copy-feedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      setTimeout(() => feedback.classList.add('hidden'), 2500);
    }
  });
}

function shareOnX(title) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(title || document.title);
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareOnLinkedIn(title) {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
}

// Lancement au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoTranslation);
} else {
  initAutoTranslation();
}
