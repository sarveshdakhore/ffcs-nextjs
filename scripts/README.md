# Build Scripts

## generate-sw.js

Auto-generates the service worker (`public/sw.js`) with a unique build version on each build.

### How it works:

1. Runs automatically before `npm run build` (via `prebuild` script in package.json)
2. Gets build version from git commit hash (or timestamp as fallback)
3. Generates `public/sw.js` with unique cache name
4. Each build creates a new service worker version

### Cache Naming:

`ffcs-cache-{gitCommitHash}-{timestamp}`

Example: `ffcs-cache-57837dd-1761516227841`

### Update Detection:

When a new build is deployed:
1. Browser fetches new service worker
2. Detects different cache name
3. Activates new service worker
4. Sends `UPDATE_AVAILABLE` message to all open tabs
5. UpdateNotification component shows reload banner
6. User clicks "Reload Now" to get latest version

### Data Safety:

- Service worker only caches static assets (JS/CSS/HTML)
- localStorage and localforage data persist through reload
- No user data is lost during updates
