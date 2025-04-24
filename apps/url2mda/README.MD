# URL2MDA - URL to MAGI Document Converter

URL2MDA is a service that converts web pages into the MAGI (Markdown for AI) format, allowing AI systems to better understand and interact with web content.

## Overview

This service fetches content from any URL and converts it to a well-structured MAGI document with:

- YAML frontmatter with rich metadata
- Markdown content
- AI-script code blocks for enhanced AI interactions

## Usage

The service converts web pages to MAGI format. It accepts GET requests with parameters specified in the query string.

### Requesting a Single Page Conversion

Make a `GET` request to the service endpoint.

**Required Query Parameter:**

- `url`: The full URL of the page to convert (e.g., `https://example.com/page`).

**Optional Query Parameters:**

- `nocache=true`: Bypass the cache and fetch a fresh version of the page (default: `false`).
- `llmFilter=true`: Apply an LLM-based filter to refine the extracted content (requires appropriate backend setup, default: `false`).

**Response Format:**

- Set the `Content-Type` header to `application/json` for a JSON response containing the MAGI document and metadata.
- Set the `Content-Type` header to `text/plain` for a plain text response containing only the MAGI document.

**Example (Single Page, JSON response):**

```
GET /?url=https://example.com/page
Content-Type: application/json
```

**Example (Single Page, Text response):**

```
GET /?url=https://example.com/page
Content-Type: text/plain
```

### Requesting a Website Crawl

Make a `GET` request to the service endpoint with the `subpages` parameter.

**Required Query Parameters:**

- `url`: The starting URL for the crawl (e.g., `https://example.com`).
- `subpages=true`: Enable crawling of subpages linked from the starting URL.

**Optional Query Parameters:**

- `nocache=true`: Bypass the cache for all pages during the crawl (default: `false`).
- `llmFilter=true`: Apply LLM filtering to each crawled page (default: `false`).

**Response Format:**

- Crawling currently only supports the `application/json` response format. Set the `Content-Type` header accordingly. The response will be a JSON array where each element represents a crawled page.

**Example (Crawl, JSON response):**

```
GET /?url=https://example.com&subpages=true&llmFilter=true
Content-Type: application/json
```

*(Note: Advanced crawl options like `maxDepth`, `limit`, `includePaths`, `excludePaths` mentioned previously are not currently implemented via URL parameters in the core request handler.)*

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
