# Cloudflare R2 examples

This directory contains example R2 bucket configuration and lifecycle files.

> **Example only; not applied or bound.** The root Worker configuration has no
> R2 binding, and this repository does not establish that an R2 bucket exists.
> See the [Cloudflare infrastructure guide](../README.md) for ownership
> boundaries.

## Purpose

- Store generated PDFs (`pdf/`)
- Store screenshots and preview media (`screenshots/`)
- Store temporary artifacts (`temp/`)

## Files

- `r2-config.json`: bucket and CORS configuration.
- `lifecycle-rules.json`: automatic cleanup for temporary files.

## Example commands

The following commands illustrate the Wrangler syntax only. Replace the bucket
placeholder with a separately verified value; these examples do not provision
or bind a bucket.

```bash
wrangler r2 bucket create <bucket-name>
```

Apply a lifecycle policy only after the bucket and policy are independently
reviewed:

```bash
wrangler r2 bucket lifecycle set <bucket-name> --file infrastructure/cloudflare/r2/lifecycle-rules.json
```

## Presigned URLs

The Workers R2 binding cannot generate presigned URLs. Cloudflare documents
presigned URLs through the S3-compatible API; see the
[official R2 presigned URL guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
This repository does not implement that flow.

## CDN Integration

- Serve signed/private downloads through Worker routes.
- Cache immutable assets at edge with long TTL.
- Keep temporary objects under `temp/` for lifecycle cleanup.

## Security Notes

- Never expose write credentials in client code.
- Keep bucket private; publish via controlled worker endpoints.
- Do not store secrets or personal data in object metadata.
