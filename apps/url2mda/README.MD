# URL2MDA - URL to MAGI Document Converter

URL2MDA is a service that converts web pages into the MAGI (Markdown for AI) format, allowing AI systems to better understand and interact with web content.

## Overview

This service fetches content from any URL and converts it to a well-structured MAGI document with:

- YAML frontmatter with rich metadata
- Markdown content
- AI-script code blocks for enhanced AI interactions

## Usage

The service supports both single page conversion and recursive crawling of websites, with configurable depth and filtering options.

### API Endpoints

- **POST /api/url**: Convert a single URL to MAGI format
- **POST /api/crawl**: Crawl a website and convert multiple pages

## Parameters

### Single URL Conversion

```json
{
  "url": "https://example.com/page",
  "options": {
    "format": "json",           // "json" or "text" response format
    "waitFor": 1000,            // milliseconds to wait for dynamic content
    "includeScreenshot": false, // include page screenshot
    "mobile": false,            // use mobile viewport
    "onlyMainContent": true     // extract main content only (excludes navigation, etc.)
  }
}
```

### Website Crawling

```json
{
  "url": "https://example.com",
  "options": {
    "format": "json",           // "json" or "text" response format
    "waitFor": 1000,            // milliseconds to wait for dynamic content
    "maxDepth": 2,              // maximum crawl depth
    "limit": 10,                // maximum number of pages to crawl
    "includePaths": [           // only crawl URLs matching these paths
      "/blog/",
      "/docs/"
    ],
    "excludePaths": [           // exclude URLs matching these paths
      "/api/",
      "/login/"
    ],
    "onlyMainContent": true,    // extract main content only
    "deduplicateSimilarURLs": true  // remove similar URLs during crawl
  }
}
```

## MAGI Format Features

The converted MAGI documents include:

### Metadata in YAML Frontmatter

- **doc-id**: Unique identifier
- **title**: Page title
- **description**: Brief description
- **created-date**: Creation timestamp
- **updated-date**: Update timestamp
- **source-url**: Original URL
- **purpose**: Inferred document purpose (tutorial, reference, etc.)
- **audience**: Target audience (developers, designers, etc.)
- **tags**: Automatically extracted topics
- **reading-time-minutes**: Estimated reading time
- **images-list**: Referenced images
- **entities**: Extracted key entities

### AI Scripts

For documents exceeding certain lengths:

- **Summarization**: Auto-extracts key points
- **Entity Extraction**: Identifies key entities within the content

## Example

```markdown
---
doc-id: "c570acf8-8941-443b-800f-2b92c77bc521"
title: "Getting Started Guide"
description: "Learn how to use our API..."
created-date: "2023-04-24T01:21:32.445Z"
updated-date: "2023-04-24T01:21:32.445Z"
source-url: "https://example.com/getting-started"
purpose: "tutorial"
audience: ["developers"]
tags: ["api", "tutorial", "web-development"]
reading-time-minutes: 5
images-list:
  - "https://example.com/images/diagram.png"
entities:
  - "REST API"
  - "Authentication"
  - "API Keys"
---

# Getting Started Guide

...content here...

<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems -->
```ai-script
{
  "script-id": "doc-summary-1682297312445",
  "prompt": "Provide a concise summary of the main points covered in this document. Focus on the key information, main arguments, and important conclusions.",
  "auto-run": true,
  "priority": "medium",
  "output-format": "markdown"
}
```
```

## Development

This service is built with:
- Cloudflare Workers
- Puppeteer headless browser

For development instructions, see the main [MAGI project README](../../README.md).
