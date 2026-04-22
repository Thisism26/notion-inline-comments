#!/usr/bin/env node

/**
 * CLI for notion-inline-comments
 */

import {
  fetchInlineComments,
  fetchFromDatabase,
  groupByContext,
  toCSV,
  toMarkdown,
} from './index.js';
import type { FetchOptions, DatabaseFetchOptions } from './index.js';

const args = process.argv.slice(2);
const pageId = args.find(a => !a.startsWith('--'));
const apiKey = getFlag('--api-key') || process.env.NOTION_API_KEY;
const tokenV2 = getFlag('--token-v2') || process.env.NOTION_TOKEN_V2;
const includeResolved = args.includes('--include-resolved');
const format = getFlag('--format') || 'text';
const isDatabase = args.includes('--database');
const limit = getFlag('--limit') ? parseInt(getFlag('--limit')!, 10) : undefined;

function getFlag(name: string): string | null {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
}

if (!pageId || args.includes('--help') || args.includes('-h')) {
  console.log(`
  💬 notion-inline-comments

  Extract Notion inline comments with exact text mapping.

  Usage:
    npx notion-inline-comments <page-id> [options]

  Options:
    --api-key <key>       Notion API key (or set NOTION_API_KEY env)
    --token-v2 <token>    Browser token_v2 for private pages
    --include-resolved    Include resolved comments
    --database            Treat ID as a database (scan all pages)
    --limit <n>           Max pages to scan (database mode only)
    --format <type>       Output format: text (default), json, csv, md
    -h, --help            Show this help

  Examples:
    npx notion-inline-comments abc123 --api-key secret_xxx
    npx notion-inline-comments abc123 --format csv > comments.csv
    npx notion-inline-comments db123 --database --format json
  `);
  process.exit(0);
}

if (!apiKey) {
  console.error('Error: API key required. Use --api-key or set NOTION_API_KEY env.');
  process.exit(1);
}

try {
  if (isDatabase) {
    // Database mode
    const dbResult = await fetchFromDatabase({
      databaseId: pageId,
      apiKey,
      tokenV2,
      includeResolved,
      limit,
    } as DatabaseFetchOptions);

    if (format === 'json') {
      console.log(JSON.stringify(dbResult, null, 2));
    } else {
      console.log(`\n📊 Scanned ${dbResult.totalPages} pages, ${dbResult.totalMapped}/${dbResult.totalComments} comments mapped\n`);
      for (const page of dbResult.pages) {
        console.log(`  📄 ${page.title} — ${page.result.mapped}/${page.result.total} comments`);
      }
      console.log('');
    }
  } else {
    // Single page mode
    const result = await fetchInlineComments({
      pageId,
      apiKey,
      tokenV2,
      includeResolved,
    } as FetchOptions);

    switch (format) {
      case 'json':
        console.log(JSON.stringify(result, null, 2));
        break;
      case 'csv':
        console.log(toCSV(result.comments));
        break;
      case 'md':
        console.log(toMarkdown(result.comments));
        break;
      default: {
        console.log(`\n✅ ${result.mapped}/${result.total} comments mapped\n`);
        const byCtx = groupByContext(result.comments);
        for (const [ctx, comments] of byCtx) {
          console.log(`  "${ctx}"`);
          for (const c of comments) {
            console.log(`    → ${c.author || 'anonymous'}: "${c.text.substring(0, 60)}..."`);
            if (c.highlightColor) console.log(`      highlight: ${c.highlightColor}`);
          }
        }
        const unmapped = result.comments.filter(c => !c.contextText);
        if (unmapped.length > 0) {
          console.log(`\n  ⚠ ${unmapped.length} comment(s) without text mapping`);
        }
        console.log('');
      }
    }
  }
} catch (err: any) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
