# Resume Project Architecture

## System Overview

This is a static site resume management system with multi-format output capabilities, deployed on Cloudflare Workers edge network.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Content Layer                       │
│  ┌──────────────────────────────────────────────┐  │
│  │        master/resume_master.md               │  │
│  │        (Single Source of Truth)              │  │
│  └──────────────────┬───────────────────────────┘  │
└─────────────────────┼──────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Derivation Layer                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  • company-specific/*.md (tailored versions) │  │
│  │  • typescript/portfolio-worker/index.html (portfolio)                │  │
│  │  • typescript/portfolio-worker/resume.html (typescript/portfolio-worker resume)              │  │
│  │  • toss/*.md (job applications)              │  │
│  └──────────────────┬───────────────────────────┘  │
└─────────────────────┼──────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│               Build Layer                            │
│  ┌──────────────────────────────────────────────┐  │
│  │  generate-worker.js                          │  │
│  │  • Reads index.html & resume.html            │  │
│  │  • Escapes template literals                 │  │
│  │  • Embeds HTML in worker.js                  │  │
│  └──────────────────┬───────────────────────────┘  │
└─────────────────────┼──────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            Deployment Layer                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  Cloudflare Workers (worker.js)              │  │
│  │  • Edge serverless deployment                │  │
│  │  • Global CDN distribution                   │  │
│  │  • Routes: / → index.html                    │  │
│  │           /resume → resume.html              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
              https://resume.jclee.me
```

## Technology Stack

### Content Management
- **Format**: Markdown (master source)
- **Editor**: Any text editor
- **Version Control**: Git

### Build Tools
- **Node.js**: Runtime for build scripts
- **generate-worker.js**: Custom HTML-to-Worker converter

### Deployment
- **Platform**: Cloudflare Workers
- **CLI**: Wrangler v3
- **CI/CD**: GitLab CI/CD

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern features (Grid, Flexbox, Custom Properties)
- **Vanilla JavaScript**: No frameworks
- **Fonts**: Google Fonts (Playfair Display, Inter)

## Design Patterns

### 1. Single Source of Truth
All resume content originates from `master/resume_master.md`, ensuring consistency across all derived versions.

### 2. Template Literal Injection
HTML files are embedded as JavaScript template literals in `worker.js` for serverless deployment.

### 3. Static Site Generation
HTML is generated at build time, then served from edge locations for maximum performance.

### 4. JAMstack Architecture
- **JavaScript**: Minimal client-side logic
- **APIs**: None (fully static)
- **Markup**: Pre-rendered HTML

## Directory Structure

```
resume/
├── master/              # Source of truth
│   ├── resume_master.md    # Complete career history
│   └── resume_final.md     # Compressed version
├── company-specific/    # Tailored versions
├── typescript/portfolio-worker/                 # Production site
│   ├── index.html          # Portfolio page
│   ├── resume.html         # Resume page
│   ├── generate-worker.js  # Build script
│   ├── worker.js           # Cloudflare Worker
│   └── wrangler.toml       # Deployment config
├── toss/                # Job application materials
├── docs/                # Alternative formats
├── data/                # Utilities
├── archive/             # Historical versions
├── resume/              # Documentation (this folder)
└── demo/                # Demo materials
```

## Data Flow

1. **Content Creation**: Update `master/resume_master.md`
2. **Derivation**: Create company-specific versions
3. **Web Generation**: Update `typescript/portfolio-worker/index.html` manually
4. **Build**: Run `node typescript/portfolio-worker/generate-worker.js`
5. **Deploy**: `wrangler deploy` or push to master (auto-deploy)
6. **Serve**: Cloudflare Workers edge network

## Security Considerations

- ✅ No backend = No server vulnerabilities
- ✅ No user input = No XSS/injection risks
- ✅ HTTPS enforced via Cloudflare
- ✅ Zero npm dependencies = No supply chain attacks
- ⚠️ External Google Fonts (consider self-hosting)

## Performance Characteristics

- **Edge Deployment**: Global latency <50ms
- **Page Weight**: ~121KB (HTML + CSS + JS)
- **Time to Interactive**: ~1.2s
- **Caching**: Cloudflare CDN + Browser cache

## Future Enhancements

1. Component-based architecture (Astro/11ty)
2. Data-driven content (JSON source)
3. Automated testing (Jest + Playwright)
4. CSS extraction for better caching
5. Image optimization (if images added)
