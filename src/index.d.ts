export interface InlineComment {
  /** The exact text the user highlighted. null if context mapping failed */
  contextText: string | null;
  /** Comment body */
  text: string;
  /** Author display name */
  author: string;
  /** Notion highlight color (e.g. "yellow_background"). null if none */
  highlightColor: string | null;
  /** Whether the discussion thread is resolved */
  resolved: boolean;
  /** Block ID the comment belongs to */
  blockId: string;
  /** Discussion thread ID */
  discussionId: string;
  /** Individual comment ID */
  commentId: string;
  /** Comment creation time (ISO 8601) */
  createdAt: string;
}

export interface DiscussionThread {
  /** Discussion thread ID */
  discussionId: string;
  /** The exact text the user highlighted */
  contextText: string | null;
  /** Notion highlight color */
  highlightColor: string | null;
  /** Whether this thread is resolved */
  resolved: boolean;
  /** Block ID */
  blockId: string;
  /** All replies in this thread */
  comments: {
    commentId: string;
    text: string;
    author: string;
    createdAt: string;
  }[];
}

export interface InlineCommentResult {
  /** All inline comments (flat list) */
  comments: InlineComment[];
  /** Comments grouped by discussion thread */
  discussions: DiscussionThread[];
  /** Number of comments with successful text mapping */
  mapped: number;
  /** Total comment count */
  total: number;
}

export interface FetchOptions {
  /** Notion page ID */
  pageId: string;
  /** Notion Integration API key */
  apiKey: string;
  /** Browser token_v2 cookie (for private pages) */
  tokenV2?: string;
  /** Include resolved comments (default: false) */
  includeResolved?: boolean;
}

/** Fetch inline comments with exact text mapping */
export function fetchInlineComments(options: FetchOptions): Promise<InlineCommentResult>;
/** Group comments by block ID */
export function groupByBlock(comments: InlineComment[]): Record<string, InlineComment[]>;
/** Group comments by context text */
export function groupByContext(comments: InlineComment[]): Map<string, InlineComment[]>;
/** Filter to resolved comments only */
export function filterResolved(comments: InlineComment[]): InlineComment[];
/** Filter to unresolved comments only */
export function filterUnresolved(comments: InlineComment[]): InlineComment[];
/** Group comments by highlight color */
export function groupByHighlight(comments: InlineComment[]): Record<string, InlineComment[]>;
