# InSnaps Article Deep Links

## How it works

Article deep links use the format:
- `https://insnaps.app/a/<token>` — Clean URL (handled by 404.html redirect)
- `https://insnaps.app/a/?t=<token>` — Query parameter URL (handled by a/index.html)

The old domain `https://www.credibletechnologies.in/a/<token>` also continues to work.

## Flow

1. User taps shared link → `insnaps.app/a/<token>`
2. GitHub Pages 404.html redirects to → `insnaps.app/a/?t=<token>`
3. `a/index.html` decodes the token and:
   - **Android**: Uses intent URL to open the app, falls back to Play Store
   - **Other**: Shows app info page with direct article link

## Token format

Tokens are base64url-encoded, XOR-encrypted, and gzip-compressed article URLs.

## Android App Links

`/.well-known/assetlinks.json` enables Android App Links verification for `insnaps.app`.
