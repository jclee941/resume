# Cloudflare R2 - resume-assets

This directory defines baseline configuration for an R2 bucket named `resume-assets` used by the resume platform.

## Purpose

- Store generated PDFs (`pdf/`)
- Store screenshots and preview media (`screenshots/`)
- Store temporary artifacts (`temp/`)

## Files

- `r2-config.json`: bucket and CORS configuration.
- `lifecycle-rules.json`: automatic cleanup for temporary files.

## Setup

1. Create bucket:

```bash
wrangler r2 bucket create resume-assets
```

2. Apply lifecycle policy (temp cleanup after 90 days):

```bash
wrangler r2 bucket lifecycle set resume-assets --file infrastructure/cloudflare/r2/lifecycle-rules.json
```

3. Bind the bucket in worker config (`wrangler.toml`) with an `r2_buckets` binding.

## Presigned URL Generation

Use signed URLs from server-side worker logic only.

```js
const object = env.RESUME_ASSETS_BUCKET.get(key);
const signedUrl = await object.createSignedUrl({
  expiresIn: 300,
  method: 'GET',
});
```

## CDN Integration

- Serve signed/private downloads through Worker routes.
- Cache immutable assets at edge with long TTL.
- Keep temporary objects under `temp/` for lifecycle cleanup.

## Security Notes

- Never expose write credentials in client code.
- Keep bucket private; publish via controlled worker endpoints.
- Do not store secrets or personal data in object metadata.
