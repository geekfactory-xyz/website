// ==============================================================================
// GEEK FACTORY — Analytics & Cookie Consent
// Conforme RGPD (Europe), Loi 25 (Québec / Canada) et CCPA/CPRA (États-Unis)
// ==============================================================================

const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Remplacer par votre identifiant de mesure Google Analytics 4

// Drapeau officiel Google pour bloquer tout tracking GA
function disableGoogleAnalyticsTracking(id) {
  window[`ga-disable-${id}`] = true;
}

// Supprime activement les cookies Google s'ils existaient préalablement
function purgeGoogleAnalyticsCookies() {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_gat')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${location.hostname}`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${location.hostname}`;
    }
  }
}

function loadGoogleAnalytics(id) {
  if (window.gaLoaded) return;
  window.gaLoaded = true;

  // Réactiver si préalablement désactivé
  window[`ga-disable-${id}`] = false;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  
  // Configuration conforme RGPD / Loi 25 / CCPA :
  // IP anonymisée, aucun partage publicitaire
  gtag('config', id, { 
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    restricted_data_processing: true
  });
}

function resetCookiePreferences() {
  localStorage.removeItem('gf_cookie_consent');
  purgeGoogleAnalyticsCookies();
  location.reload();
}

function initCookieConsent() {
  const consent = localStorage.getItem('gf_cookie_consent');

  if (consent === 'accepted') {
    loadGoogleAnalytics(GA_MEASUREMENT_ID);
    return;
  }

  if (consent === 'declined') {
    // Verrouillage total et suppression de résidus
    disableGoogleAnalyticsTracking(GA_MEASUREMENT_ID);
    purgeGoogleAnalyticsCookies();
    return;
  }

  // Inject popup banner RGPD, Loi 25 et CCPA
  const banner = document.createElement('div');
  banner.id = 'cookie-consent-banner';
  banner.className = 'fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-lg z-50 p-5 rounded-2xl bg-[#0e1017] border border-white/10 shadow-2xl backdrop-blur-md transition-all duration-300';
  banner.innerHTML = `
    <div class="flex items-start gap-3.5">
      <div class="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-indigo-400 shrink-0 mt-0.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>
      <div class="flex-1 space-y-2.5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-sm font-semibold text-white">Respect de votre vie privée</h3>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-500/30">
              RGPD • Loi 25 • CCPA
            </span>
          </div>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Nous utilisons des témoins de connexion (cookies) de mesure d'audience anonymes via Google Analytics. Conformément au <strong>RGPD</strong> (UE), à la <strong>Loi 25</strong> (Québec) et au <strong>CCPA</strong> (États-Unis), ces témoins sont désactivés par défaut et ne sont activés qu'avec votre consentement exprès. Nous ne vendons et ne partageons aucune donnée personnelle.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <a href="politique-confidentialite.html" class="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
            En savoir plus & politique de confidentialité ↗
          </a>

          <div class="flex items-center gap-2 shrink-0">
            <button id="btn-decline-cookies" class="py-1.5 px-3.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition-colors">
              Refuser
            </button>
            <button id="btn-accept-cookies" class="py-1.5 px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('btn-accept-cookies').addEventListener('click', () => {
    localStorage.setItem('gf_cookie_consent', 'accepted');
    banner.remove();
    loadGoogleAnalytics(GA_MEASUREMENT_ID);
  });

  document.getElementById('btn-decline-cookies').addEventListener('click', () => {
    localStorage.setItem('gf_cookie_consent', 'declined');
    banner.remove();
    disableGoogleAnalyticsTracking(GA_MEASUREMENT_ID);
    purgeGoogleAnalyticsCookies();
  });
}

// Lancer après chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieConsent);
} else {
  initCookieConsent();
}
