# How the extension works

## What changes in the browser

The extension registers a content script for the supported YouTube sites. It runs at `document_start`, in the page's `MAIN` JavaScript world, so YouTube's own scripts can see its changes before making playback decisions.

When enabled, `src/force-av1.js` changes these answers for AV1 video types:

| API or setting | Answer YouTube sees |
| --- | --- |
| `HTMLMediaElement.prototype.canPlayType()` | `probably` |
| `MediaSource.isTypeSupported()` | `true` |
| `ManagedMediaSource.isTypeSupported()`, when present | `true` |
| `navigator.mediaCapabilities.decodingInfo()` | `supported`, `smooth`, and `powerEfficient` are `true` |
| `yt-player-av1-pref` storage access | `8192`, YouTube's older AV1 preference |

Other codec queries pass through to the original browser functions. The extension does not supply a decoder, re-encode videos, or block other codecs. A supported decoder must already exist in the browser.

`powerEfficient: true` is a spoofed capability answer. It is not evidence of lower power use. Similarly, `smooth: true` is not a guarantee that the device can decode the selected video fast enough.

## Turning it off

The background worker saves the selected mode and changes the registered script. The registration persists across browser sessions. Already-open pages keep their current script until they are reloaded.

Disabled pages run a small cleanup script instead of the capability overrides. Version 0.1 permanently wrote `8192` to YouTube's storage; the cleanup removes that exact old value. Version 0.1 did not back up the value it replaced, so it cannot be restored. Current overrides stay local to the loaded page.

The popup compares the saved setting with the active YouTube page's flag. It enables **Reload YouTube** when the two differ. Reloading one tab does not reload other videos. If the tab cannot be inspected, a successful setting change still enables a reload for a supported YouTube tab.

## Scope and limits

- Runs on `www.youtube.com`, `m.youtube.com`, and `www.youtube-nocookie.com`, including matching embedded frames.
- Excludes standalone `www.youtube.com/live_chat*` pages.
- YouTube chooses what it serves. Some videos, streams, resolutions, and protected content may not work with this approach.
- A device without enough decoding performance may drop frames, heat up, or use noticeably more power.
- The extension does not measure bandwidth savings, battery use, or the codec currently playing. Use YouTube's **Stats for nerds** to check the codec.
- YouTube may change its player or stop honoring the older preference. Treat the extension as a preference override, not a guaranteed force switch.

## Testing

`node scripts/check.cjs` checks JavaScript syntax, the manifest, referenced assets, icon dimensions, local documentation links, and the approval-owner file. `node tests/behavior.cjs` uses isolated JavaScript fixtures for codec matching, passthrough, stored-preference cleanup, registration changes, save-failure rollback, and rapid setting changes.

`tests/popup.cjs` renders the real popup with simulated extension APIs. It exercises the switch and reload button and can regenerate the screenshots. These checks do not measure real YouTube bandwidth savings or device power use.

## Further reading

- [AOMedia's AV1 overview](https://aomedia.org/specifications/av1/)
- [YouTube's use of Media Capabilities](https://web.dev/case-studies/youtube-media-capabilities)
- [Media Capabilities API](https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo)
- [Chrome content-script registration](https://developer.chrome.com/docs/extensions/reference/api/scripting)
