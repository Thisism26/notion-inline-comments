export interface InlineComment {
  /** 사용자가 드래그한 정확한 텍스트. null이면 context 매핑 실패 */
  contextText: string | null;
  /** 댓글 내용 */
  text: string;
  /** 작성자 이름 */
  author: string;
  /** 댓글이 달린 블록 ID */
  blockId: string;
  /** discussion ID (공식 API ↔ 비공식 API 매핑 키) */
  discussionId: string;
  /** 댓글 작성 시각 (ISO 8601) */
  createdAt: string;
}

export interface InlineCommentResult {
  /** 모든 인라인 댓글 */
  comments: InlineComment[];
  /** context 매핑에 성공한 댓글 수 */
  mapped: number;
  /** 전체 댓글 수 */
  total: number;
}

export interface FetchOptions {
  /** 노션 페이지 ID */
  pageId: string;
  /** 노션 공식 API 키 (Integration token) */
  apiKey: string;
  /** 노션 브라우저 token_v2 (비공개 페이지용, 보통 불필요) */
  tokenV2?: string;
}

/**
 * 노션 페이지의 인라인 댓글을 정확한 텍스트 매핑과 함께 가져옵니다.
 */
export function fetchInlineComments(options: FetchOptions): Promise<InlineCommentResult>;

/**
 * 댓글 목록을 blockId별로 그룹핑합니다.
 */
export function groupByBlock(comments: InlineComment[]): Record<string, InlineComment[]>;

/**
 * 댓글 목록을 contextText별로 그룹핑합니다.
 */
export function groupByContext(comments: InlineComment[]): Map<string, InlineComment[]>;
