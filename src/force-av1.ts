(function forceYouTubeAv1() {
  'use strict';

  const EXTENSION_TAG = 'force-youtube-av1';
  const AV1_PREF_KEY = 'yt-player-av1-pref';
  const AV1_PREF_ALWAYS = '8192';

  if (window.__forceYouTubeAv1Installed) {
    return;
  }

  Object.defineProperty(window, '__forceYouTubeAv1Installed', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
  window.__forceYouTubeAv1Version = '0.2.0';

  const isAv1VideoType = (type: unknown): boolean => {
    if (typeof type !== 'string') {
      return false;
    }

    const normalized = type.toLowerCase();
    return normalized.startsWith('video/') &&
      /\bcodecs\s*=/.test(normalized) &&
      /\bav0?1(?:\.|,|\s|["']|$)/.test(normalized);
  };

  const isAv1MediaConfig = (configuration: MediaDecodingConfiguration): boolean => {
    return Boolean(configuration &&
      configuration.video &&
      isAv1VideoType(configuration.video.contentType));
  };

  const patchValue = <T extends object, K extends keyof T>(
    target: T | undefined,
    property: K,
    replacementFactory: (original: T[K]) => T[K]
  ): boolean => {
    if (!target || typeof target[property] !== 'function') {
      return false;
    }

    const original = target[property];
    if ('__forceYouTubeAv1Patched' in original && original.__forceYouTubeAv1Patched) {
      return true;
    }

    const replacement = replacementFactory(original);
    try {
      Object.defineProperty(replacement, 'name', {
        value: original.name,
        configurable: true
      });
    } catch (_) {
      // Function names are cosmetic; failure here is harmless.
    }

    Object.defineProperty(replacement, '__forceYouTubeAv1Patched', {
      value: true,
      configurable: false
    });

    try {
      Object.defineProperty(target, property, {
        value: replacement,
        configurable: true,
        writable: true
      });
      return true;
    } catch (_) {
      try {
        target[property] = replacement;
        return target[property] === replacement;
      } catch (_) {
        return false;
      }
    }
  };

  const forceStoredAv1Preference = () => {
    try {
      // Migrate the persisted value from the original prototype. New overrides stay page-local,
      // so switching off and reloading restores YouTube's normal behavior.
      if (window.localStorage.getItem(AV1_PREF_KEY) === AV1_PREF_ALWAYS) {
        window.localStorage.removeItem(AV1_PREF_KEY);
      }
    } catch (_) {
      // YouTube can still see the patched Storage accessors below.
    }

    const storagePrototype = window.Storage && window.Storage.prototype;
    if (!storagePrototype || storagePrototype.__forceYouTubeAv1StoragePatched) {
      return;
    }

    const originalGetItem = storagePrototype.getItem;
    const originalSetItem = storagePrototype.setItem;

    if (typeof originalGetItem === 'function') {
      patchValue(storagePrototype, 'getItem', (original) => function getItem(this: Storage, ...args: Parameters<Storage['getItem']>) {
        const [key] = args;
        if (this === window.localStorage && key === AV1_PREF_KEY) {
          return AV1_PREF_ALWAYS;
        }
        return original.apply(this, args);
      });
    }

    if (typeof originalSetItem === 'function') {
      patchValue(storagePrototype, 'setItem', (original) => function setItem(this: Storage, ...args: Parameters<Storage['setItem']>) {
        const [key] = args;
        if (this === window.localStorage && key === AV1_PREF_KEY) {
          return undefined;
        }
        return original.apply(this, args);
      });
    }

    try {
      Object.defineProperty(storagePrototype, AV1_PREF_KEY, {
        get(this: Storage) {
          if (this === window.localStorage) {
            return AV1_PREF_ALWAYS;
          }
          return originalGetItem.call(this, AV1_PREF_KEY);
        },
        set(this: Storage, value: string) {
          if (this === window.localStorage) {
            return;
          }
          originalSetItem.call(this, AV1_PREF_KEY, value);
        },
        configurable: true
      });
    } catch (_) {
      // Some browsers may reject redefining Storage properties.
    }

    Object.defineProperty(storagePrototype, '__forceYouTubeAv1StoragePatched', {
      value: true,
      configurable: false
    });
  };

  const patchCanPlayType = () => {
    const prototype = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
    patchValue(prototype, 'canPlayType', (original) => function canPlayType(this: HTMLMediaElement, ...args: Parameters<HTMLMediaElement['canPlayType']>) {
      const [type] = args;
      if (isAv1VideoType(type)) {
        return 'probably';
      }
      return original.apply(this, args);
    });
  };

  const patchMediaSourceConstructor = (constructor: Pick<typeof MediaSource, 'isTypeSupported'> | undefined) => {
    patchValue(constructor, 'isTypeSupported', (original) => function isTypeSupported(this: typeof constructor, ...args: Parameters<typeof MediaSource.isTypeSupported>) {
      const [type] = args;
      if (isAv1VideoType(type)) {
        return true;
      }
      return original.apply(this, args);
    });
  };

  const patchMediaSource = () => {
    patchMediaSourceConstructor(window.MediaSource);
    patchMediaSourceConstructor(window.ManagedMediaSource);
  };

  const patchMediaCapabilities = () => {
    const mediaCapabilities = window.navigator && window.navigator.mediaCapabilities;
    if (!mediaCapabilities || typeof mediaCapabilities.decodingInfo !== 'function') {
      return;
    }

    patchValue(mediaCapabilities, 'decodingInfo', (original) => function decodingInfo(this: MediaCapabilities, ...args: Parameters<MediaCapabilities['decodingInfo']>) {
      const [configuration] = args;
      if (!isAv1MediaConfig(configuration)) {
        return original.apply(this, args);
      }

      return Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: true,
        keySystemAccess: null
      });
    });
  };

  forceStoredAv1Preference();
  patchCanPlayType();
  patchMediaSource();
  patchMediaCapabilities();

  console.info(EXTENSION_TAG, 'installed');
}());
