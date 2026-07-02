# Deploy guide — host the 1040-maps bundle yourself

> You are hosting **static files**: the built `<bundle>.js` files (+ `manifest.json`)
> that `npm run build` emits into `public/js/`. There is **no server-side app and no
> database** — any static host works. Pick the option that matches what you already use.
>
> **Two rules that apply to every option:**
> 1. **CORS** — partner pages embed your bundle cross-origin, so the response must send
>    `Access-Control-Allow-Origin: *` (or your allow-list).
> 2. **No secrets in the files** — the Mapbox token comes from each page's
>    `profile-config.tk` at runtime, so the static bundles are safe to serve publicly.

Each option below is one page. The bundles are identical across all of them.

---

## Option A — Railway (managed, Dockerfile)

Best if you want a managed URL with zero server admin. This repo already ships a
`railway.toml` + `Dockerfile` that build the bundles and serve them via nginx with CORS.

1. Create a Railway service pointed at `embeddables/micro-frontends/1040-maps`.
2. Railway reads `railway.toml` → `builder = "dockerfile"` and builds automatically
   (it runs `npm run build` inside the image — npm only, never pnpm).
3. Deploy. Your origin is `https://<service>.up.railway.app/<bundle>.js`.
4. Verify: `curl -I https://<service>.up.railway.app/manifest.json` → `200` with
   `Access-Control-Allow-Origin: *`.

Full detail: `../docs/RAILWAY-DEPLOY.md`. `PORT` is injected by Railway; nothing else
to configure.

---

## Option B — Coolify (self-hosted PaaS, Dockerfile)

Best if you run your own box and want a Railway-like UX you control.

1. In Coolify, **New Resource → Application → Dockerfile**, repo root set to
   `embeddables/micro-frontends/1040-maps`.
2. Coolify builds the same `Dockerfile` (build stage runs `npm run build`; runtime
   stage is nginx). It assigns `$PORT` the same way Railway does — the image already
   honors it.
3. Set the domain Coolify gives you (or your own) and enable HTTPS via its Let's
   Encrypt integration.
4. Verify the `/healthz` and `/manifest.json` endpoints as in Option A.

No extra env vars. CORS is already set inside the image's nginx config.

---

## Option C — Plain nginx (your own VM)

Best if you already run nginx and just want to drop files behind it.

1. On a build machine: `cd embeddables/micro-frontends/1040-maps && npm run build`.
   The bundles land in `../../../public/js/` (the repo's host output dir).
2. Copy just those files to your server, e.g. `/var/www/1040-maps/`:
   ```bash
   rsync -av ../../../public/js/ user@server:/var/www/1040-maps/
   ```
3. Server block:
   ```nginx
   server {
       listen 443 ssl;
       server_name cdn.example.org;
       root /var/www/1040-maps;

       location / {
           add_header Access-Control-Allow-Origin  "*"            always;
           add_header Cache-Control "public, max-age=300"         always;
           try_files $uri =404;
       }
       # ssl_certificate ... (use certbot)
   }
   ```
4. `nginx -t && systemctl reload nginx`. Bundle URL: `https://cdn.example.org/<bundle>.js`.

To update a bundle later, re-run `npm run build` and re-`rsync` — no nginx change.

---

## Option D — S3 + CloudFront (object storage / CDN)

Best for scale and global edge caching; no servers at all.

1. Build locally: `npm run build` → bundles in `../../../public/js/`.
2. Upload to a bucket:
   ```bash
   aws s3 sync ../../../public/js/ s3://my-1040-maps-bucket/ \
     --content-type application/javascript --cache-control "public, max-age=300"
   ```
   (Set `--content-type application/json` for `manifest.json`.)
3. Put **CloudFront** in front of the bucket and attach a CORS response-headers policy
   that sends `Access-Control-Allow-Origin: *`. (Static-website-hosting on the bucket
   alone does not add CORS — do it at CloudFront, or via bucket CORS config for direct
   S3 URLs.)
4. Bundle URL: `https://dxxxx.cloudfront.net/<bundle>.js`.

To update, re-`sync` and create a CloudFront invalidation for the changed paths
(or rely on the 5-minute `max-age`).

---

## Which should I pick?

| You have / want | Pick |
|---|---|
| A managed URL, no ops | **A — Railway** |
| Your own server, Railway-like UX | **B — Coolify** |
| An existing nginx box | **C — nginx** |
| Global CDN scale, no servers | **D — S3 + CloudFront** |

All four serve the identical bundles. Teams embedding your origin only ever change
their own `profile-config` (see `README.md`) — never your hosting.
