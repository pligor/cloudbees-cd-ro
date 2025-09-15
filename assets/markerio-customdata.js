(function () {
  // Optional app-provided hints. Example:
  // window.APP_CONTEXT = {
  //   userType: 'Private',                   // 'Private' | 'Business'
  //   userId: '12345',                       // presence => Identified
  //   mainAddressCountry: 'AT',              // 'AT' or ISO-3166-1 alpha-2
  //   buildVersion: '2025.09.15.1234',       // your FE build tag
  //   authTokenKey: 'access_token'           // key name in localStorage/cookies
  // };
  const CTX = window.APP_CONTEXT || {};

  const UAD = navigator.userAgentData;
  const UA = navigator.userAgent || '';
  const PLAT = (UAD && UAD.platform) || navigator.platform || '';

  function byMeta(name) {
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute('content') : null;
  }

  function detectEnvironment() {
    const host = location.hostname.toLowerCase();
    if (host.includes('localhost') || host.startsWith('127.')) return 'testing';
    if (host.includes('dev') || host.includes('qa') || host.includes('test')) return 'testing';
    if (host.includes('stage') || host.includes('staging') || host.includes('preprod') || host.includes('uat')) return 'staging';
    return 'production';
  }

  function detectOS() {
    // Default
    let os = 'Unknown';
    let version = 'Unknown';

    if (/Android/i.test(UA)) {
      os = 'Android';
      const m = UA.match(/Android\s([\d\.]+)/i);
      version = m ? m[1] : 'Unknown';
    } else if (/iPhone|iPad|iPod/i.test(UA)) {
      os = 'iOS';
      const m = UA.match(/OS\s([\d_]+)/i);
      version = m ? m[1].replace(/_/g, '.') : 'Unknown';
    } else if (/Mac OS X/i.test(UA)) {
      os = 'macOS';
      const m = UA.match(/Mac OS X\s([\d_]+)/i);
      version = m ? m[1].replace(/_/g, '.') : 'Unknown';
    } else if (/Windows NT/i.test(UA)) {
      os = 'Windows';
      const map = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
      const m = UA.match(/Windows NT\s([\d\.]+)/i);
      version = m ? (map[m[1]] || m[1]) : 'Unknown';
    } else if (/Linux/i.test(UA)) {
      os = 'Linux';
    }

    return { os, version };
  }

  function detectDeviceBrandModel() {
    if (/iPhone/i.test(UA)) return 'Apple iPhone';
    if (/iPad/i.test(UA)) return 'Apple iPad';
    if (/Pixel/i.test(UA)) {
      const m = UA.match(/Pixel\s[\w\s]+/i);
      return m ? `Google ${m[0]}` : 'Google Pixel';
    }
    if (/SM-[A-Z0-9]+/i.test(UA)) {
      const m = UA.match(/SM-[A-Z0-9]+/i);
      return m ? `Samsung ${m[0]}` : 'Samsung';
    }
    if (/Samsung/i.test(UA)) return 'Samsung';
    if (/HUAWEI/i.test(UA)) return 'Huawei';
    if (/Xiaomi|Mi |Redmi/i.test(UA)) return 'Xiaomi/Redmi';
    if (/OnePlus/i.test(UA)) return 'OnePlus';
    if (/MOTO|Motorola/i.test(UA)) return 'Motorola';
    if (/Nokia/i.test(UA)) return 'Nokia';
    return 'Unknown';
  }

  function orientation() {
    try {
      if (screen.orientation && screen.orientation.type) {
        return screen.orientation.type.includes('portrait') ? 'Portrait' : 'Landscape';
      }
    } catch (_) { }
    return (window.innerHeight >= window.innerWidth) ? 'Portrait' : 'Landscape';
  }

function theme() {
  const htmlTheme = document.documentElement && document.documentElement.getAttribute
    ? document.documentElement.getAttribute('data-theme')
    : null;

  const bodyTheme = document.body && document.body.getAttribute
    ? document.body.getAttribute('data-theme')
    : null;

  const explicit = htmlTheme || bodyTheme;
  if (explicit) return explicit.toLowerCase() === 'dark' ? 'Dark' : 'Light';

  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  return mq && mq.matches ? 'Dark' : 'Light';
}

  function connectionInfo() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = c && (c.effectiveType || c.type);
    return {
      connectionState: navigator.onLine ? 'Online' : 'Offline',
      connectionType: type ? String(type) : 'Unknown',
      downlinkMbps: c && typeof c.downlink === 'number' ? c.downlink : null,
      rttMs: c && typeof c.rtt === 'number' ? c.rtt : null
    };
  }

  function tryGetJwtFromStorage() {
    const keys = [
      CTX.authTokenKey,
      'access_token', 'accessToken', 'token', 'jwt', 'id_token'
    ].filter(Boolean);

    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v && v.split('.').length === 3) return v;
      } catch (_) { }
      // try cookies
      try {
        const cookie = document.cookie.split('; ').find(x => x.startsWith(k + '='));
        if (cookie) {
          const v = decodeURIComponent(cookie.split('=')[1]);
          if (v && v.split('.').length === 3) return v;
        }
      } catch (_) { }
    }
    return null;
  }

  function parseJwtPayload(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function tokenState() {
    const token = tryGetJwtFromStorage();
    if (!token) return { sessionState: 'Unknown', tokenExpiresInSec: null, tokenExpIso: null };

    const pl = parseJwtPayload(token);
    if (!pl || !pl.exp) return { sessionState: 'Unknown', tokenExpiresInSec: null, tokenExpIso: null };

    const now = Math.floor(Date.now() / 1000);
    const diff = pl.exp - now;
    return {
      sessionState: diff <= 0 ? 'Expired' : (diff < 300 ? 'ExpiringSoon' : 'Active'),
      tokenExpiresInSec: diff,
      tokenExpIso: new Date(pl.exp * 1000).toISOString()
    };
  }

  function isMobileUA() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(UA);
  }

  function buildCustomData() {
    const env = detectEnvironment();
    const { os, version } = detectOS();
    const brandModel = detectDeviceBrandModel();
    const conn = connectionInfo();
    const tok = tokenState();

    // User dimensions (prefer app hints, fall back to Unknown)
    const mainAddressCountry = CTX.mainAddressCountry || byMeta('user-country') || 'Unknown';
    const userType = CTX.userType || byMeta('user-type') || 'Unknown';
    const userKind = CTX.userId ? 'Identified' : 'Unidentified';

    const insideAT =
      mainAddressCountry && mainAddressCountry !== 'Unknown'
        ? (String(mainAddressCountry).toUpperCase() === 'AT')
        : 'Unknown';

    // Screen and viewport
    const viewport = `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`;
    const screenSize = `${window.screen.width}x${window.screen.height}`;

    return {
      // Business/user context
      userType,                                 // 'Private' | 'Business' | 'Unknown'
      userKind,                                 // 'Identified' | 'Unidentified'
      mainAddressCountry,                       // 'AT' or ISO code
      mainAddressInAustria: insideAT,           // true | false | 'Unknown'

      // Auth/session
      sessionState: tok.sessionState,           // Active | ExpiringSoon | Expired | Unknown
      tokenExpiresInSec: tok.tokenExpiresInSec, // nullable number
      tokenExpIso: tok.tokenExpIso,             // nullable ISO string

      // Device/runtime
      platform: isMobileUA() ? 'Mobile Web' : 'Desktop Web',
      deviceOS: os,                             // Android | iOS | Windows | macOS | Linux | Unknown
      deviceOSVersion: version,
      deviceBrandModel: brandModel,             // best-effort from UA
      orientation: orientation(),               // Portrait | Landscape
      theme: theme(),                           // Light | Dark
      viewportPx: viewport,                     // e.g. 390x844
      screenPx: screenSize,                     // e.g. 1080x2340
      devicePixelRatio: window.devicePixelRatio || 1,

      // Connection
      connectionState: conn.connectionState,    // Online | Offline
      connectionType: conn.connectionType,      // 'wifi'|'4g'|'3g'|'slow-2g'|... or 'Unknown'
      downlinkMbps: conn.downlinkMbps,
      rttMs: conn.rttMs,

      // App/env
      runtimeEnvironment: env,                  // testing | staging | production
      pagePath: location.pathname,
      pageQuery: location.search || '',
      buildVersion: CTX.buildVersion || byMeta('app-build') || 'Unknown'
    };
  }

  // --- replace your applyCustomData with this ---
  function applyCustomData(customData) {
    window.markerConfig = window.markerConfig || {};
    window.markerConfig.customData = customData; // baseline, for early load

    try {
      if (window.Marker) {
        // Prefer object-method API
        if (typeof window.Marker.setCustomData === 'function') {
          window.Marker.setCustomData(customData);
        } else if (typeof window.Marker === 'function') {
          // Fallback for function-style SDKs
          window.Marker('setCustomData', customData);
        }
        // Also (re)apply when the widget is fully loaded
        if (typeof window.Marker.on === 'function') {
          window.Marker.on('load', function () {
            if (typeof window.Marker.setCustomData === 'function') {
              window.Marker.setCustomData(customData);
            } else if (typeof window.Marker === 'function') {
              window.Marker('setCustomData', customData);
            }
          });
          // Optional: ensure freshest data right before submit
          window.Marker.on('feedbackbeforesend', function () {
            const latest = buildCustomData(); // your existing function
            if (typeof window.Marker.setCustomData === 'function') {
              window.Marker.setCustomData(latest);
            } else if (typeof window.Marker === 'function') {
              window.Marker('setCustomData', latest);
            }
          });
        }
      }
    } catch (_) { }

    window.__markerCustomData = customData; // for console inspection
  }

function refresh() {
  let data;
  try {
    data = buildCustomData();
  } catch (err) {
    // Never fail silently in a demo: set minimal data and keep going
    console.warn('[markerio-customdata] build failed, falling back:', err);
    data = {
      runtimeEnvironment: (function(){ 
        const host = location.hostname.toLowerCase();
        if (host.includes('localhost') || host.startsWith('127.')) return 'testing';
        if (host.includes('dev') || host.includes('qa') || host.includes('test')) return 'testing';
        if (host.includes('stage') || host.includes('staging') || host.includes('preprod') || host.includes('uat')) return 'staging';
        return 'production';
      })(),
      pagePath: location.pathname,
      pageQuery: location.search || '',
      buildVersion: (window.APP_CONTEXT && window.APP_CONTEXT.buildVersion) || 'Unknown',
      error: 'buildCustomData_failed'
    };
  }
  applyCustomData(data);
}

  // Initial apply
  refresh();

  // Keep it fresh on important changes
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);

  const dm = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (dm && typeof dm.addEventListener === 'function') dm.addEventListener('change', refresh);

  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', refresh);
  } else {
    window.addEventListener('orientationchange', refresh);
  }

  // --- Fail-safe: wire Marker even if this file loaded before the shim ---
  (function waitForMarkerAndWire() {
    let wired = false;
    let tries = 0;
    const maxTries = 80; // ~20s at 250ms

    function nowData() { return buildCustomData(); }

    function tryWire() {
      if (wired) return true;
      const M = window.Marker;
      if (!M) return false;

      const data = nowData();

      // Set immediately (queues if the full widget isn't ready yet)
      if (typeof M.setCustomData === 'function') {
        M.setCustomData(data);
      } else if (typeof M === 'function') {
        M('setCustomData', data);
      }

      // Also refresh on load and right before submit
      if (typeof M.on === 'function') {
        M.on('load', function () {
          const d = nowData();
          if (typeof M.setCustomData === 'function') M.setCustomData(d);
          else if (typeof M === 'function') M('setCustomData', d);
        });
        M.on('feedbackbeforesend', function () {
          const d = nowData();
          if (typeof M.setCustomData === 'function') M.setCustomData(d);
          else if (typeof M === 'function') M('setCustomData', d);
        });
      }

      wired = true;
      return true;
    }

    // Try now, then poll briefly until stub shows up
    if (!tryWire()) {
      const timer = setInterval(function () {
        tries++;
        if (tryWire() || tries >= maxTries) clearInterval(timer);
      }, 250);
    }
  })();
})();
