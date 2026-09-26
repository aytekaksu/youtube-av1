(function resetLegacyAv1Preference() {
  'use strict';
  // The original prototype wrote this forced value to YouTube's storage. Remove only that value
  // when switching off; keep all other YouTube preferences intact.
  try {
    if (window.localStorage.getItem('yt-player-av1-pref') === '8192') {
      window.localStorage.removeItem('yt-player-av1-pref');
    }
  } catch (_) { /* Storage may be unavailable in embedded players. */ }
  window.__forceYouTubeAv1Version = '0.2.1';
}());
