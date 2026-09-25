# Cloudflare Pages Deployment Guide (T4.1.3)

This document provides setup and deployment instructions for deploying the Speqtus Medical Ordering Web App to **Cloudflare Pages**.

---

## 1. Build Configuration Summary

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | None / Static HTML |
| **Build Command** | `npm run build:web` |
| **Build Output Directory** | `dist` |
| **Root Directory** | `/` |
| **Node.js Version** | `20` (set `NODE_VERSION=20` in env vars) |

---

## 2. Environment Variables

Configure these environment variables in **Cloudflare Pages > Settings > Environment variables**:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `NODE_VERSION` | Yes | `20` |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Production Supabase URL (e.g. `https://xyz.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anonymous key |
| `R2_PUBLIC_URL_PREFIX` | Yes | Public Cloudflare R2 image prefix |

---

## 3. SPA Routing & Deep Linking

Expo Router relies on client-side routing. To ensure direct links (e.g., `/admin`, `/category/123`, `/order/abc`) do not trigger Cloudflare 404 errors:

1. `public/_routes.json` routes all requests `/*` to Cloudflare Pages static asset handler.
2. `public/_redirects` rewrites `/*` to `/index.html 200` so the SPA router resolves sub-paths in the browser.
3. When running `npm run build:web` (`expo export -p web`), Expo automatically copies all files in `public/` into the root of `dist/`.

---

## 4. Local Web Build & Preview

```bash
# Export static web bundle to ./dist
npm run build:web

# Preview locally with wrangler or npx serve
npx wrangler pages dev dist
# Or
npx serve dist
```

---

## 5. Direct Deployment via Wrangler CLI (Optional)

```bash
# Build web bundle
npm run build:web

# Deploy to Cloudflare Pages project
npx wrangler pages deploy dist --project-name=speqtus-medical-ordering
```
