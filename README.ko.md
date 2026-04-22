<div align="center">

# 💬 notion-inline-comments

**노션 API의 빠진 퍼즐 조각.**

인라인 댓글을 정확히 어떤 텍스트에 달렸는지와 함께 추출합니다.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇺🇸 English](./README.md)

</div>

---

## 왜 필요한가?

노션에서 텍스트를 드래그하고 댓글을 달면, 노션은 *어떤 텍스트를 선택했는지 정확히* 알고 있습니다.

하지만 공식 API는 **그 정보를 주지 않습니다**:

```diff
  공식 API 응답:
  ✅ 댓글:     "핵심 디자인 결정이다..."
  ✅ 블록:     "abc123..."
- ❌ 선택 텍스트: ???
```

이 패키지가 그걸 되찾아줍니다:

```diff
  notion-inline-comments:
  ✅ 댓글:     "핵심 디자인 결정이다..."
  ✅ 블록:     "abc123..."
+ ✅ 선택 텍스트: "디자인 토큰"  ← 사용자가 드래그한 바로 그 텍스트
```

## 어떻게?

```
  노션 공식 API                     비공식 내부 API
  ─────────────────────            ──────────────────────────
  "핵심 디자인 결정이다..."           discussion.context:
   + discussionId: abc-123          "디자인 토큰"
   + blockId: def-456               + discussionId: abc-123
         │                                │
         └────────── ID로 합치기 ──────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ "디자인 토큰"        │
              │  → "핵심 디자인      │
              │    결정이다..."      │
              └─────────────────────┘
```

노션 웹앱은 내부 API(`/api/v3/loadPageChunk`)를 사용하는데, 여기서 `discussion` 객체가 반환됩니다. 각 객체에는 **선택한 정확한 텍스트**가 담긴 `context` 필드가 있습니다. 이것을 공식 API의 댓글 데이터와 `discussionId`로 매칭합니다.

---

## 빠른 시작

```bash
npm install notion-inline-comments
```

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments, mapped, total } = await fetchInlineComments({
  pageId: '노션-페이지-ID',
  apiKey: process.env.NOTION_API_KEY,
});

console.log(`✅ ${mapped}/${total}개 매핑 완료`);

for (const c of comments) {
  console.log(`"${c.contextText}" → "${c.text}"`);
}
```

```
✅ 3/3개 매핑 완료
"디자인 토큰"        → "시각적 기반을 정의하는..."
"따뜻한 중립 팔레트"  → "모든 색상이 따뜻한 톤을..."
"반응형 레이아웃"     → "모바일 우선 브레이크포인트를..."
```

---

## API

### `fetchInlineComments(options)`

메인 함수. 노션 페이지의 모든 인라인 댓글을 텍스트 매핑과 함께 가져옵니다.

```typescript
const result = await fetchInlineComments({
  pageId: string,    // 노션 페이지 ID (필수)
  apiKey: string,    // Integration API 키 (필수)
  tokenV2?: string,  // 비공개 페이지용 브라우저 쿠키 (선택)
});
```

**반환값:**

```typescript
{
  comments: InlineComment[],
  mapped: number,   // contextText가 있는 댓글 수
  total: number,    // 전체 댓글 수
}
```

**`InlineComment`:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `contextText` | `string \| null` | 하이라이트된 정확한 텍스트. 매핑 실패 시 `null` |
| `text` | `string` | 댓글 내용 |
| `author` | `string` | 작성자 |
| `blockId` | `string` | 소속 블록 |
| `discussionId` | `string` | 공식 ↔ 내부 API 연결 키 |
| `createdAt` | `string` | ISO 8601 타임스탬프 |

---

### 헬퍼 함수

#### `groupByBlock(comments)` — 블록별 그룹핑

#### `groupByContext(comments)` — 선택 텍스트별 그룹핑

---

## 활용 사례

**🎨 포트폴리오 / 블로그** — 노션 댓글을 정확한 텍스트 위치에 호버 툴팁으로 표시

**📝 문서 관리** — 리뷰 워크플로우를 위한 어노테이션 컨텍스트 추출

**🔍 콘텐츠 분석** — 피드백을 글의 특정 문구에 매핑

---

## 요구사항

- **Node.js** ≥ 18
- 페이지 접근 권한이 있는 [노션 Integration](https://www.notion.so/my-integrations)

## 제한사항

> 이 패키지는 discussion context 데이터에 접근하기 위해 [`notion-client`](https://github.com/NotionX/react-notion-x)(비공식 API)를 사용합니다. 널리 사용되고 활발히 유지보수되지만, 내부 API는 예고 없이 변경될 수 있습니다.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
