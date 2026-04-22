#!/usr/bin/env node

/**
 * CLI for notion-inline-comments
 * 
 * Usage:
 *   npx notion-inline-comments <page-id> --api-key <key>
 *   NOTION_API_KEY=secret_xxx npx notion-inline-comments <page-id>
 */

import { fetchInlineComments, groupByContext } from './index.js';

const args = process.argv.slice(2);
const pageId = args.find(a => !a.startsWith('--'));
const apiKey = getFlag('--api-key') || process.env.NOTION_API_KEY;
const tokenV2 = getFlag('--token-v2') || process.env.NOTION_TOKEN_V2;
const includeResolved = args.includes('--include-resolved');
const json = args.includes('--json');

function getFlag(name) {
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
    --json                Output as JSON
    -h, --help            Show this help

  Examples:
    NOTION_API_KEY=secret_xxx npx notion-inline-comments abc123
    npx notion-inline-comments abc123 --api-key secret_xxx --json
  `);
  process.exit(0);
}

if (!apiKey) {
  console.error('Error: API key required. Use --api-key or set NOTION_API_KEY env.');
  process.exit(1);
}

try {
  const result = await fetchInlineComments({ pageId, apiKey, tokenV2, includeResolved });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n✅ ${result.mapped}/${result.total} comments mapped\n`);

    const byCtx = groupByContext(result.comments);
    for (const [ctx, comments] of byCtx) {
      console.log(`  "${ctx}"`);
      for (const c of comments) {
        console.log(`    → ${c.author || 'anonymous'}: "${c.text.substring(0, 60)}..."`);
        if (c.highlightColor) console.log(`      highlight: ${c.highlightColor}`);
      }
    }

    // Show unmapped comments
    const unmapped = result.comments.filter(c => !c.contextText);
    if (unmapped.length > 0) {
      console.log(`\n  ⚠ ${unmapped.length} comment(s) without text mapping`);
    }

    console.log('');
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
