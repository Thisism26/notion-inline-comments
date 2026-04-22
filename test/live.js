/**
 * Live test with a real Notion page.
 * 
 * Usage:
 *   NOTION_API_KEY=secret_xxx node test/live.js <page-id>
 */
import { fetchInlineComments, groupByContext } from '../dist/index.js';

const pageId = process.argv[2];
const apiKey = process.env.NOTION_API_KEY;

if (!pageId || !apiKey) {
  console.error('Usage: NOTION_API_KEY=secret_xxx node test/live.js <page-id>');
  process.exit(1);
}

const result = await fetchInlineComments({ pageId, apiKey });

console.log(`\n✅ ${result.mapped}/${result.total} comments mapped\n`);

const byCtx = groupByContext(result.comments);
for (const [ctx, comments] of byCtx) {
  console.log(`"${ctx}"`);
  for (const c of comments) {
    console.log(`  → ${c.author}: "${c.text.substring(0, 60)}..."`);
  }
}
