import dotenv from 'dotenv';
dotenv.config({ path: '../personal-web/.env' });
import { NotionAPI } from 'notion-client';

const api = new NotionAPI();
const data = await api.getPage('34ac0e4e369d803c9d4afda1a4b924cf');

// discussion 전체 구조
const discussions = data.discussion || {};
console.log('=== 전체 discussion 키:', Object.keys(discussions).length, '개 ===\n');

for (const [id, d] of Object.entries(discussions)) {
  const v = d.value?.value;
  console.log('─'.repeat(50));
  console.log('ID:', v?.id);
  console.log('parent_id:', v?.parent_id);
  console.log('resolved:', v?.resolved);
  console.log('comments:', v?.comments);  // 댓글 ID 배열
  console.log('context:', JSON.stringify(v?.context, null, 2));
  // context 안의 어노테이션 파싱
  if (v?.context?.[0]?.[1]) {
    for (const ann of v.context[0][1]) {
      console.log('  annotation:', ann[0], '=', ann[1]);
    }
  }
  console.log('');
}
