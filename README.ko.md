<div align="center">

# 💬 notion-inline-comments

**노션 API의 빠진 퍼즐 조각.**

인라인 댓글을 정확히 어떤 텍스트에 달렸는지와 함께 추출합니다.

[![npm version](https://img.shields.io/npm/v/notion-inline-comments?color=cb3837&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/notion-inline-comments)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

[🇺🇸 English](./README.md)

<br />

<img src="./assets/hero.png" alt="노션 페이지의 하이라이트 댓글이 구조화된 데이터로 추출되는 과정" width="640" />

</div>

---

## 왜 필요한가?

노션에서 텍스트를 드래그하고 댓글을 달면, 노션은 *어떤 단어를 선택했는지 정확히* 알고 있습니다.

**하지만 공식 API는 그 정보를 주지 않습니다.**

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
+ ✅ 선택 텍스트: "디자인 토큰"  ← 드래그한 바로 그 텍스트
```

---

## 설치

```bash
npm install notion-inline-comments
```

## 사용법

**3줄이면 됩니다:**

```javascript
import { fetchInlineComments } from 'notion-inline-comments';

const { comments } = await fetchInlineComments({
  pageId: '페이지-ID',           // 노션 URL에서 복사
  apiKey: 'secret_xxx',          // notion.so/my-integrations에서 발급
});

// 끝. 각 댓글에 .contextText가 있습니다
comments.forEach(c => {
  console.log(c.contextText);    // "디자인 토큰"  ← 하이라이트한 텍스트
  console.log(c.text);           // "이것은..."   ← 댓글 내용
});
```

### 실제 활용 예시

노션 댓글을 호버 툴팁으로 렌더링 — 정확한 텍스트 위치에 매핑됩니다:

<div align="center">
<img src="./assets/demo-tooltip.png" alt="하이라이트된 텍스트 위에 노션 댓글이 호버 툴팁으로 표시되는 모습" width="640" />
<br />
<em>"literary salon" 위에 마우스 → 해당 텍스트의 댓글만 표시</em>
</div>

---

## 작동 원리

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
              ┌─────────────────────────────┐
              │  contextText: "디자인 토큰"   │
              │  text: "핵심 디자인           │
              │        결정이다..."           │
              └─────────────────────────────┘
```

노션 웹앱은 내부 엔드포인트(`/api/v3/loadPageChunk`)를 사용하며, 여기서 `discussion` 객체가 반환됩니다. 각 객체에는 선택한 텍스트가 담긴 `context` 필드가 있습니다. 이것을 `discussionId`로 공식 API 데이터와 합칩니다.

---

## API 레퍼런스

### `fetchInlineComments(options)` → `Promise<Result>`

| 옵션 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `pageId` | `string` | ✅ | 노션 URL의 페이지 ID |
| `apiKey` | `string` | ✅ | [notion.so/my-integrations](https://notion.so/my-integrations)에서 발급한 토큰 |
| `tokenV2` | `string` | | 비공개 페이지용 브라우저 쿠키 |

**반환값:**

```typescript
{
  comments: [{
    contextText: string | null,  // 하이라이트한 텍스트 (매핑 실패 시 null)
    text: string,                // 댓글 내용
    author: string,              // 작성자
    blockId: string,
    discussionId: string,
    createdAt: string,           // ISO 8601
  }],
  mapped: number,  // contextText가 있는 댓글 수
  total: number,   // 전체 댓글 수
}
```

### 헬퍼 함수

```javascript
import { groupByBlock, groupByContext } from 'notion-inline-comments';

// 블록별 그룹핑
groupByBlock(comments);   // { "block-1": [...], "block-2": [...] }

// 선택 텍스트별 그룹핑
groupByContext(comments);  // Map { "디자인 토큰" => [...] }
```

---

## 요구사항

- **Node.js** ≥ 18
- 페이지 접근 권한이 있는 [노션 Integration](https://www.notion.so/my-integrations)

> **참고:** 이 패키지는 discussion context를 위해 [`notion-client`](https://github.com/NotionX/react-notion-x)(비공식 API)를 사용합니다. 내부 API는 예고 없이 변경될 수 있습니다.

---

<div align="center">

MIT © [Thisism26](https://github.com/Thisism26)

</div>
