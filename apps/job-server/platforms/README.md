# Job Automation Platforms

This directory contains platform-specific integrations for the unified job automation system.

## Structure

```
platforms/
├── wanted/          - Wanted (원티드) - Korea IT/Startup
├── jobkorea/        - JobKorea (잡코리아) - Korea #1 Job Platform
├── saramin/         - Saramin (사람인) - Korea #2 Job Platform
└── linkedin/        - LinkedIn - Global Professional Network
```

## Each Platform Includes

- `*-crawler.js` - Platform-specific crawler implementation
- Configuration and API integration
- Job search and application logic

## Shared Components (in parent directory)

- `src/ai/` - AI Matcher (OpenCode 3.5 Sonnet)
- `src/dashboard/` - Unified Dashboard
- `src/application-manager/` - Application tracking
- `src/notifiers/` - Slack/Email notifications

## Adding New Platforms

1. Create new directory: `platforms/new-platform/`
2. Implement crawler extending `BaseCrawler`
3. Add to unified system
4. Test and deploy

## Usage

All platforms are accessible through the unified API and dashboard.
See parent README.md for usage instructions.
