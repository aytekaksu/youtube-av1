# Privacy

Force YouTube AV1 works locally in your browser. The extension contains no analytics, advertising, tracking service, account system, or backend server.

It saves one on/off setting using the browser's local extension storage. It reads the active tab's address to identify supported YouTube pages and checks a page-local flag to know whether a reload is needed. This information is not sent elsewhere by the extension.

While enabled, it changes the browser capability answers visible to YouTube. It also supplies an AV1 playback preference. When upgrading from version 0.1, it removes the old forced `8192` value from YouTube's local storage. It leaves other preference values alone.

Site access is limited to `https://www.youtube.com/*`, `https://m.youtube.com/*`, and `https://www.youtube-nocookie.com/*`. The extension does not read your browser history or send videos through another server.

YouTube continues to receive your normal visits and video requests under its own policies. Installing this extension does not make YouTube anonymous.

Public GitHub pages may load images from GitHub and shields.io. These README images are not loaded by the installed extension.
