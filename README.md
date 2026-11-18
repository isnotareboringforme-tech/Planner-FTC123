# Study Planner

A study planner (tasks, week view, grades, focus timer) with a hidden section. Works offline and installs to the home screen on iPhone, iPad and desktop.

## Running it
Host the folder on any static host (GitHub Pages works) or run `python3 -m http.server` in it and open http://localhost:8000. The service worker and Google sign-in need http(s), not `file://`.

## Arcade tab (hidden section)
Library with categories (FPS, Battle Royale, Sandbox, Strategy, Survival, Multiplayer), search, favorites, pins, hiding,
ratings, notes, playlists, custom thumbnails, dashboard, stats, daily challenges, achievements, game finder quiz, compare,
themes, music, backup/restore, privacy controls, loading progress and a Fix panel for blank games.

### Adding or changing games
Edit the `GL` list at the top of `arcade.js` (one line per game), or add games from Arcade > Discover > "Add your own game".

### Sign in with Google
1. Go to https://console.cloud.google.com > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
2. Under **Authorized JavaScript origins** add your site address (for GitHub Pages: `https://YOURNAME.github.io`).
3. Paste the Client ID into `config.js` (`gid`) so it works for everyone, or let each person paste their own in Arcade > Settings > Account.

Sign-in only identifies you on this device (name and photo for the welcome message). It does not sync data between devices.

### About history and privacy
Games load in an iframe created by script. The page address never changes (no hash, no pushState) and the app never opens
a game in a new tab or window, so playing adds nothing to Chrome or Safari history. Be aware that:
- the planner page itself is still in history like any page you visit;
- a school or workplace network can still see which sites a device contacts, and each game site keeps its own cookies and storage;
- Arcade keeps its own recents/stats in this browser only. Use Settings > Privacy to turn that off, erase on exit, or delete everything.
- The older Videos "Search YouTube" button and Cloud "Open in its own window" button open a new tab, which does appear in history.

### Embedding limits
Some sites refuse to be shown inside another page. Use Fix > "The screen is blank" to flag it, or Fix > custom link to use a different address.
iPhone Safari has no mouse lock, so keyboard-and-mouse games (Eaglercraft, Krunker, Minecraft Classic, etc.) are marked "Test controls".
