type SettingsRequest =
  | { type: 'get-settings' }
  | { type: 'set-enabled'; enabled: boolean };

type SettingsResponse =
  | { ok: true; enabled: boolean }
  | { ok: false; error: string };

interface Window {
  __forceYouTubeAv1Installed?: boolean;
  __forceYouTubeAv1Version?: string;
  ManagedMediaSource?: Pick<typeof MediaSource, 'isTypeSupported'>;
}

interface Storage {
  __forceYouTubeAv1StoragePatched?: boolean;
}
