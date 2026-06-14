import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
	Button,
	Callout,
	Stack,
	Text,
	useCanvasAction,
	useCanvasState,
	useHostTheme,
} from 'cursor/canvas';

const CONTEXT_USAGE_CANVAS_TOP_FOCUS_CATEGORY_ID = '__context_usage_canvas_top__';

// ============================================================================
// Data contract — mirrors ContextUsageCanvasData in contextUsageCanvasFileContents.ts.
// Keep the two in sync; they cannot be shared across the canvas string boundary.
// ============================================================================
type ContextUsageCanvasCategory = {
	id: string;
	label: string;
	tokens: number;
	displayTokens: string;
	color?: string;
};

type ContextUsageCanvasItem = {
	id: string;
	parentId?: string;
	categoryId: string;
	label: string;
	text: string;
	bodyKind?: 'context' | 'note';
	estimatedTokens?: number;
	characterCount?: number;
	source?: {
		kind: 'file';
		path: string;
		label: string;
	};
};

type ContextUsageCanvasData = {
	categories: ContextUsageCanvasCategory[];
	contextWindowSize: number;
	contextWindowLabel: string;
	totalTokensUsed: number;
	totalTokensLabel: string;
	percentFullLabel: string;
	items?: ContextUsageCanvasItem[];
	/** tool call pair group id → overview label (e.g. Grep Tool). */
	toolCallGroupLabels?: Readonly<Record<string, string>>;
	/** Sidebar display name for the composer chat this breakdown belongs to. */
	composerChatName?: string;
	/** Composer chat id — used to link the title back to this chat in the IDE. */
	composerId?: string;
	/** Workspace/repository name shown in the header metadata. */
	repository?: string;
	/** When set, the canvas scrolls to a category, or to the top for the top sentinel. */
	focus?: { categoryId: string; nonce: number };
};

type Color =
	| 'gray'
	| 'purple'
	| 'green'
	| 'yellow'
	| 'pink'
	| 'blue'
	| 'orange';

// ============================================================================
// Copy & labels
// ============================================================================
const CATEGORY_HELP: Record<string, string> = {
	system_prompt:
		'The system prompt is the set of instructions Cursor provides to an agent at the start of every chat. It defines the agent’s tone, sets ground rules, and outlines how it should use tools.',
	tools:
		'Tool definitions describe everything the agent can do, such as reading files, running commands, or searching the web. Tool definitions help the agent know what its options are, and Cursor manages this for you.',
	rules:
		'Rules are standing instructions the agent follows each turn. Use them to define style conventions, security best practices, or general context for how your project fits together. Keep rules focused and lightweight to avoid bloat.',
	skills:
		'Skills are reusable prompts for common tasks. The agent can invoke skills automatically when they’re appropriate, or you can trigger them yourself via a slash command. Use skills when you notice yourself spelling out the same steps over and over.',
	mcp:
		'MCP servers connect the agent to outside services like workplace messengers, issue trackers, and design tools. Each additional MCP occupies some of the context window, so it’s worth keeping them to just the ones you need.',
	subagents:
		'Subagents are focused helpers the main agent can delegate tasks to, in order to complete big jobs in parallel. This workflow can help free up context in the main agent, since it doesn’t need to occupy itself with every detail.',
	summarized_conversation:
		'Conversations are automatically summarized into a short recap when they get too long. This helps the main agent free up context and maintain space for the task at hand.',
	conversation:
		'This is the running back-and-forth of your chat: your prompts, the agent’s replies, and the tool calls in between. It’s normal for the conversation to grow quite large as you work, and Cursor will periodically summarize it to free up space.',
	uncategorized:
		'This covers tokens that don’t fall neatly into the buckets above.',
};

function getCategoryHelpText(categoryId: string): string {
	return (
		CATEGORY_HELP[categoryId] ??
		'How much of the context window this category used on the last agent turn.'
	);
}

const COPY = {
	eyebrow: 'Context Usage Report',
	donutCaption: 'Full',
	explorerTitle: 'Context Explorer',
	debugButton: 'Debug with Agent',
	expandAll: 'Expand All',
	collapseAll: 'Collapse All',
	openChat: 'Open Chat',
	emptyState: 'No context breakdown loaded yet.',
	contextFullTitle: 'Context window is getting full',
	metaRepository: 'Repository',
	metaContextSize: 'Context size',
	metaTokensUsed: 'Tokens used',
	intro:
		'The context window contains everything your agent sees on a single turn. This includes Cursor’s own instructions, any relevant files, the tools it can access, and the conversation itself. The agent reads all of this each turn, and it can only hold so much. As the context window fills up, the agent has less room to reason, replies can slow down, and older details may be dropped to make space. Some of what’s here is set up by Cursor and some is yours to control.',
	explorerIntro:
		'The categories below show what’s in your agent’s context window, sorted by how many tokens it’s using right now.',
} as const;

// ============================================================================
// Token formatting
// ============================================================================
function formatTokenCount(count: number): string {
	// Full count with thousands separators (e.g. 8,134), not shortened to 8.1K.
	return Math.round(count).toLocaleString('en-US');
}

function estimateTokensFromText(text: string): number {
	return Math.max(0, Math.round(text.length / 4));
}

function getItemEstimatedTokens(item: ContextUsageCanvasItem): number {
	if (item.estimatedTokens !== undefined && item.estimatedTokens > 0) {
		return item.estimatedTokens;
	}
	return estimateTokensFromText(item.text);
}

// Trailing counts list a bare number; only the first category row spells out
// the "tokens" unit (handled in CategoryCollapsibleSection).
function formatTokenLabel(tokens: number): string {
	return `~${formatTokenCount(tokens)}`;
}

function formatItemTrailing(item: ContextUsageCanvasItem): string {
	return formatTokenLabel(getItemEstimatedTokens(item));
}

function formatGroupTrailing(children: readonly ContextUsageCanvasItem[]): string {
	const total = children.reduce(
		(sum, child) => sum + getItemEstimatedTokens(child),
		0,
	);
	return formatTokenLabel(total);
}

// ============================================================================
// Layout constants
// Rows are always full width. Nesting is created with inner left padding (never
// a narrower offset row), so hover/background spans edge to edge at every level.
// ============================================================================
const ROW_PAD_X_PX = 12;
const ROW_GAP_PX = 12;
const ROW_MIN_HEIGHT_PX = 36;
const ROW_BOX_PX = 20; // every chevron / icon sits in a 20x20 centered box
const ROW_ICON_PX = 16; // glyph size inside that box
const ROW_INDENT_STEP_PX = ROW_BOX_PX + ROW_GAP_PX; // one nesting level
const ROW_BORDER_RADIUS_PX = 6;

// Shared text scales (spread alongside a color). TITLE_TEXT keeps the chat name,
// "Context Explorer", and donut percentage matched; META_LABEL_TEXT keeps the
// report eyebrow, header stat labels, and donut caption matched.
const TITLE_TEXT: CSSProperties = {
	fontSize: 24,
	lineHeight: '30px',
	fontWeight: 400,
};
const META_LABEL_TEXT: CSSProperties = {
	fontSize: 13,
	lineHeight: '18px',
};
// =============================================================================
// Icons
// Every glyph is a verbatim 16x16 path from the cursor-icons "16/outline" set.
// Add a new icon by dropping its path here and referencing it by key via <Icon>.
// =============================================================================
const ICON_PATHS = {
	server:
		'M13.5 0.875C14.3975 0.875 15.125 1.60254 15.125 2.5V13.5C15.125 14.3975 14.3975 15.125 13.5 15.125H2.5C1.60254 15.125 0.875 14.3975 0.875 13.5V2.5C0.875 1.60254 1.60254 0.875 2.5 0.875H13.5ZM2.125 13.5C2.125 13.7071 2.29289 13.875 2.5 13.875H13.5C13.7071 13.875 13.875 13.7071 13.875 13.5V8.625H2.125V13.5ZM8.875 10.375C9.35825 10.375 9.75 10.7668 9.75 11.25C9.75 11.7332 9.35825 12.125 8.875 12.125C8.39175 12.125 8 11.7332 8 11.25C8 10.7668 8.39175 10.375 8.875 10.375ZM11.375 10.375C11.8582 10.375 12.25 10.7668 12.25 11.25C12.25 11.7332 11.8582 12.125 11.375 12.125C10.8918 12.125 10.5 11.7332 10.5 11.25C10.5 10.7668 10.8918 10.375 11.375 10.375ZM2.5 2.125C2.29289 2.125 2.125 2.29289 2.125 2.5V7.375H13.875V2.5C13.875 2.29289 13.7071 2.125 13.5 2.125H2.5ZM8.875 3.875C9.35825 3.875 9.75 4.26675 9.75 4.75C9.75 5.23325 9.35825 5.625 8.875 5.625C8.39175 5.625 8 5.23325 8 4.75C8 4.26675 8.39175 3.875 8.875 3.875ZM11.375 3.875C11.8582 3.875 12.25 4.26675 12.25 4.75C12.25 5.23325 11.8582 5.625 11.375 5.625C10.8918 5.625 10.5 5.23325 10.5 4.75C10.5 4.26675 10.8918 3.875 11.375 3.875Z',
	wrench:
		'M10.53 0.381836C11.1776 0.415247 11.7961 0.564516 12.364 0.807617C12.5544 0.88935 12.692 1.06025 12.7312 1.26367C12.7703 1.46696 12.7064 1.67663 12.5603 1.82324L10.4431 3.94141V3.94238C9.99684 4.38866 9.99684 5.11134 10.4431 5.55762H10.4421C10.8885 6.00362 11.6123 6.00369 12.0583 5.55762L14.1755 3.44043L14.2341 3.38867C14.3752 3.27897 14.5581 3.23428 14.7361 3.26855C14.9395 3.30791 15.1105 3.44529 15.1921 3.63574C15.4701 4.28477 15.6257 4.99972 15.6257 5.75C15.6257 8.62563 13.3668 10.9739 10.5271 11.1182L10.2507 11.125C9.65226 11.125 9.0761 11.0249 8.53784 10.8438L4.68921 14.6924C3.75504 15.6258 2.24039 15.626 1.3064 14.6924V14.6914C0.37335 13.7573 0.372475 12.2426 1.3064 11.3086L5.15503 7.45898C4.97481 6.92128 4.87573 6.34674 4.87573 5.75C4.87573 2.78147 7.2822 0.375 10.2507 0.375L10.53 0.381836ZM10.2507 1.625C7.97256 1.625 6.12573 3.47183 6.12573 5.75C6.12573 6.32678 6.24333 6.87443 6.45581 7.37109C6.55607 7.60558 6.50397 7.87801 6.32397 8.05859L2.19116 12.1924V12.1934C1.74572 12.6389 1.74493 13.3613 2.19019 13.8076C2.63615 14.2533 3.36037 14.2535 3.8064 13.8076L7.94019 9.6748L8.01147 9.61328C8.18785 9.48383 8.42233 9.45498 8.62769 9.54297C9.12545 9.75618 9.67401 9.875 10.2507 9.875L10.4626 9.86914C12.642 9.75843 14.3757 7.95677 14.3757 5.75C14.3757 5.51662 14.3555 5.28799 14.3181 5.06543L12.9431 6.44141V6.44238C12.0089 7.3766 10.4937 7.37581 9.55933 6.44238H9.55835C8.62392 5.50795 8.62392 3.99205 9.55835 3.05762L10.9333 1.68164C10.7803 1.65609 10.624 1.63903 10.4656 1.63086L10.2507 1.625Z',
	listBullets:
		'M2.25 11.75C2.94036 11.75 3.5 12.3096 3.5 13C3.5 13.6904 2.94036 14.25 2.25 14.25C1.55964 14.25 1 13.6904 1 13C1 12.3096 1.55964 11.75 2.25 11.75ZM14.5 12.375C14.8452 12.375 15.125 12.6548 15.125 13C15.125 13.3452 14.8452 13.625 14.5 13.625H6.5C6.15482 13.625 5.875 13.3452 5.875 13C5.875 12.6548 6.15482 12.375 6.5 12.375H14.5ZM2.25 6.75C2.94036 6.75 3.5 7.30964 3.5 8C3.5 8.69036 2.94036 9.25 2.25 9.25C1.55964 9.25 1 8.69036 1 8C1 7.30964 1.55964 6.75 2.25 6.75ZM14.5 7.375C14.8452 7.375 15.125 7.65482 15.125 8C15.125 8.34518 14.8452 8.625 14.5 8.625H6.5C6.15482 8.625 5.875 8.34518 5.875 8C5.875 7.65482 6.15482 7.375 6.5 7.375H14.5ZM2.25 1.75C2.94036 1.75 3.5 2.30964 3.5 3C3.5 3.69036 2.94036 4.25 2.25 4.25C1.55964 4.25 1 3.69036 1 3C1 2.30964 1.55964 1.75 2.25 1.75ZM14.5 2.375C14.8452 2.375 15.125 2.65482 15.125 3C15.125 3.34518 14.8452 3.625 14.5 3.625H6.5C6.15482 3.625 5.875 3.34518 5.875 3C5.875 2.65482 6.15482 2.375 6.5 2.375H14.5Z',
	lightning:
		'M7.98828 0.390137C8.145 0.167255 8.42867 0.0717021 8.68848 0.153809C8.94824 0.235996 9.12489 0.477068 9.125 0.749512V5.37451H14C14.2332 5.37451 14.4471 5.50457 14.5547 5.71143C14.6621 5.91829 14.6456 6.1681 14.5117 6.35889L8.01172 15.6089C7.855 15.8319 7.57142 15.9274 7.31152 15.8452C7.05173 15.763 6.875 15.522 6.875 15.2495V10.6245H2C1.76676 10.6245 1.55284 10.4946 1.44531 10.2876C1.33797 10.0807 1.35433 9.83088 1.48828 9.64014L7.98828 0.390137ZM3.20312 9.37451H7.5C7.84509 9.37451 8.12486 9.65445 8.125 9.99951V13.272L12.7969 6.62451H8.5C8.15484 6.62449 7.875 6.34468 7.875 5.99951V2.72607L3.20312 9.37451Z',
	logoMcp:
		'M9.17676 0.5C9.87894 0.5 10.5534 0.773976 11.0566 1.26367C11.3478 1.54686 11.5684 1.89474 11.6992 2.2793C11.83 2.66372 11.8676 3.07371 11.8096 3.47559C12.2169 3.41767 12.6324 3.45418 13.0234 3.58203C13.4144 3.7099 13.771 3.92653 14.0654 4.21387L14.0967 4.24512C14.343 4.48472 14.5391 4.77136 14.6729 5.08789C14.8065 5.4045 14.875 5.74518 14.875 6.08887C14.8749 6.43235 14.8064 6.77243 14.6729 7.08887C14.5391 7.40555 14.3431 7.69294 14.0967 7.93262L8.65527 13.2676C8.63885 13.2835 8.6261 13.3031 8.61719 13.3242C8.60828 13.3453 8.60352 13.3677 8.60352 13.3906C8.60352 13.4135 8.6083 13.436 8.61719 13.457C8.6261 13.4781 8.63885 13.4977 8.65527 13.5137L9.77246 14.6094C9.82173 14.6573 9.86094 14.715 9.8877 14.7783C9.91445 14.8417 9.92871 14.9098 9.92871 14.9785C9.92871 15.0473 9.91444 15.1154 9.8877 15.1787C9.86094 15.242 9.82172 15.2998 9.77246 15.3477C9.67182 15.4453 9.53674 15.5 9.39648 15.5C9.2562 15.4999 9.12112 15.4454 9.02051 15.3477L7.90332 14.252C7.78824 14.1401 7.69627 14.0062 7.63379 13.8584C7.57131 13.7106 7.53906 13.5511 7.53906 13.3906C7.53911 13.2303 7.5714 13.0715 7.63379 12.9238C7.69627 12.776 7.78822 12.6421 7.90332 12.5303L13.3447 7.19434C13.4925 7.05049 13.6102 6.87847 13.6904 6.68848C13.7706 6.49848 13.8115 6.29412 13.8115 6.08789C13.8115 5.88166 13.7706 5.6773 13.6904 5.4873C13.6102 5.29731 13.4925 5.12529 13.3447 4.98145L13.3135 4.95117C13.0118 4.6576 12.6074 4.49256 12.1865 4.49219C11.7656 4.49184 11.3607 4.65613 11.0586 4.94922L6.57617 9.3457L6.5752 9.34668L6.51367 9.40723C6.41299 9.50519 6.27817 9.56053 6.1377 9.56055C5.99723 9.56055 5.86241 9.50517 5.76172 9.40723C5.71243 9.35929 5.67324 9.30162 5.64648 9.23828C5.61978 9.175 5.60547 9.10678 5.60547 9.03809C5.60552 8.96947 5.61978 8.9011 5.64648 8.83789C5.67323 8.77475 5.71256 8.71773 5.76172 8.66992L10.3066 4.21191C10.454 4.06803 10.5715 3.89586 10.6514 3.70605C10.7312 3.51616 10.7726 3.31148 10.7725 3.10547C10.7722 2.8996 10.7305 2.69549 10.6504 2.50586C10.5702 2.31621 10.4522 2.1446 10.3047 2.00098C10.0027 1.70722 9.59804 1.54297 9.17676 1.54297C8.75546 1.54303 8.35075 1.70714 8.04883 2.00098L2.03223 7.90137C1.93159 7.99898 1.79646 8.05371 1.65625 8.05371C1.51601 8.0536 1.38084 7.99912 1.28027 7.90137C1.23106 7.8535 1.19276 7.79565 1.16602 7.73242C1.13926 7.66909 1.125 7.60098 1.125 7.53223C1.125 7.46347 1.13926 7.39537 1.16602 7.33203C1.19276 7.2688 1.23106 7.21096 1.28027 7.16309L7.29688 1.26367C7.80007 0.773976 8.47462 0.500066 9.17676 0.5ZM9.17676 2.58594C9.31715 2.58594 9.45206 2.64044 9.55273 2.73828C9.60202 2.78621 9.64122 2.8439 9.66797 2.90723C9.69472 2.97056 9.70898 3.03867 9.70898 3.10742C9.70896 3.17611 9.6947 3.24434 9.66797 3.30762C9.64122 3.37081 9.60193 3.42774 9.55273 3.47559L5.10352 7.83984C4.95572 7.98369 4.83802 8.1557 4.75781 8.3457C4.67762 8.53569 4.63574 8.74007 4.63574 8.94629C4.63578 9.15229 4.67774 9.35609 4.75781 9.5459C4.83801 9.73588 4.95575 9.90792 5.10352 10.0518C5.4055 10.3457 5.81006 10.5107 6.23145 10.5107C6.65278 10.5107 7.05743 10.3456 7.35938 10.0518L11.8086 5.68848C11.9092 5.59055 12.0442 5.53528 12.1846 5.53516C12.3251 5.53516 12.4608 5.59044 12.5615 5.68848C12.6108 5.73639 12.65 5.79413 12.6768 5.85742C12.7034 5.92065 12.7168 5.989 12.7168 6.05762C12.7167 6.12624 12.7035 6.1946 12.6768 6.25781C12.65 6.32094 12.6106 6.37796 12.5615 6.42578L8.11133 10.79C7.60804 11.2795 6.93351 11.5537 6.23145 11.5537C5.5294 11.5537 4.85487 11.2795 4.35156 10.79C4.10511 10.5504 3.90916 10.263 3.77539 9.94629C3.64175 9.62979 3.57231 9.28985 3.57227 8.94629C3.57227 8.60251 3.64162 8.26199 3.77539 7.94531C3.90915 7.62864 4.10513 7.34221 4.35156 7.10254L8.80078 2.73828C8.90143 2.64037 9.03634 2.58598 9.17676 2.58594Z',
	pointerArrow:
		'M14.7171 2.375C15.6119 2.37535 15.9294 3.56015 15.1546 4.00781L8.99442 7.56348V14.6768C8.99403 15.5716 7.80923 15.8892 7.36161 15.1143L0.764925 3.6875C0.428289 3.10425 0.849338 2.37517 1.52274 2.375H14.7171ZM2.17313 3.625L7.74442 13.2764V7.49219C7.74442 7.09042 7.95908 6.7186 8.30692 6.51758L13.3167 3.625H2.17313Z',
	chatBubble:
		'M8.25195 0.375C12.3251 0.375 15.627 3.6769 15.627 7.75C15.627 11.8231 12.3251 15.125 8.25195 15.125H1.50195C1.15686 15.1249 0.876953 14.8451 0.876953 14.5V7.75C0.876953 3.67696 4.17894 0.375099 8.25195 0.375ZM8.25195 1.625C4.86929 1.6251 2.12695 4.36732 2.12695 7.75V13.875H8.25195C11.6347 13.875 14.377 11.1327 14.377 7.75C14.377 4.36726 11.6347 1.625 8.25195 1.625Z',
	chatBubbles:
		'M10 0.875C12.8302 0.875243 15.125 3.16962 15.125 6V10.5C15.125 10.8452 14.8452 11.125 14.5 11.125H11C10.4875 13.4141 8.44568 15.1249 6.00195 15.125H1.5C1.33426 15.125 1.17482 15.0586 1.05762 14.9414C0.94071 14.8242 0.875 14.6655 0.875 14.5L0.876953 10C0.876953 7.52084 2.63768 5.4536 4.97656 4.97852C5.44999 2.63752 7.51944 0.87516 10 0.875ZM4.88379 6.29102C3.28903 6.77092 2.12695 8.249 2.12695 10L2.125 13.875H6.00195C7.75362 13.8749 9.23073 12.7118 9.70996 11.1162C7.11094 10.971 5.02928 8.88995 4.88379 6.29102ZM10 2.125C7.86005 2.12518 6.125 3.86001 6.125 6C6.125 8.13999 7.86005 9.87482 10 9.875H13.875V6C13.875 3.8601 12.14 2.12521 10 2.125Z',
	history:
		'M7.93402 0.874505C9.62869 0.854353 11.3217 1.4676 12.6108 2.56786C13.3858 3.22499 14.0173 4.05129 14.4487 4.97118C14.7366 5.58403 14.9368 6.23856 15.0405 6.90771C15.0659 7.07141 15.0249 7.23881 14.9272 7.37255C14.8293 7.50634 14.6818 7.59618 14.518 7.62158C14.3546 7.64676 14.1877 7.60582 14.0541 7.50829C13.9205 7.41043 13.8305 7.2628 13.8051 7.09911C13.7196 6.54728 13.5543 6.00779 13.3168 5.50243C12.961 4.74386 12.4403 4.06286 11.8012 3.52099C10.7384 2.61393 9.34289 2.10794 7.94574 2.1245C6.54841 2.1336 5.16166 2.66474 4.11566 3.5913C3.06467 4.5123 2.36315 5.8214 2.17816 7.20654C1.98581 8.59052 2.31151 10.0389 3.07758 11.2075C3.8375 12.3803 5.0314 13.2633 6.37543 13.646C7.7175 14.0359 9.19832 13.9224 10.4653 13.3325C11.2259 12.9811 11.9168 12.4789 12.4897 11.8579C12.7008 11.6293 12.8938 11.3832 13.0707 11.1245H10.4995C10.1543 11.1244 9.87445 10.8446 9.87445 10.4995C9.87467 10.1546 10.1545 9.87458 10.4995 9.87451H14.4995C14.8445 9.87451 15.1242 10.1545 15.1245 10.4995V14.4995C15.1245 14.8447 14.8446 15.1245 14.4995 15.1245C14.1543 15.1244 13.8745 14.8446 13.8745 14.4995V11.895C13.7225 12.1449 13.5543 12.3855 13.3696 12.6138C12.7349 13.3997 11.9126 14.0416 10.9897 14.4673C9.45313 15.1827 7.65738 15.32 6.02973 14.8472C4.39977 14.383 2.95232 13.3124 2.0307 11.8901C1.10147 10.4728 0.706533 8.71625 0.939883 7.03759C1.16424 5.3577 2.01486 3.7708 3.28949 2.6538C4.5581 1.53001 6.23928 0.885545 7.93402 0.874505ZM8.00043 4.3745C8.34528 4.37473 8.62521 4.65465 8.62543 4.99951V7.99951C8.62543 8.34454 8.34542 8.62428 8.00043 8.62451H5.00043C4.65525 8.62451 4.37543 8.34468 4.37543 7.99951C4.37565 7.65451 4.65539 7.37451 5.00043 7.37451H7.37543V4.99951C7.37565 4.65451 7.65539 4.3745 8.00043 4.3745Z',
	square:
		'M13 0.875C14.1736 0.875 15.125 1.82639 15.125 3V13C15.125 14.1736 14.1736 15.125 13 15.125H3C1.8264 15.125 0.875 14.1736 0.875 13V3C0.875 1.8264 1.82639 0.875 3 0.875H13ZM3 2.125C2.51675 2.125 2.125 2.51675 2.125 3V13C2.125 13.4832 2.51675 13.875 3 13.875H13C13.4832 13.875 13.875 13.4832 13.875 13V3C13.875 2.51675 13.4832 2.125 13 2.125H3Z',
	triangleSmallRight:
		'M6.76074 4.42297C6.99429 4.32624 7.26363 4.37899 7.44238 4.55774L10.4424 7.55774C10.6864 7.80182 10.6864 8.19844 10.4424 8.4425L7.44238 11.4425C7.26364 11.6212 6.99427 11.674 6.76074 11.5773C6.52731 11.4805 6.37503 11.2528 6.375 11.0001V5.00012C6.375 4.7474 6.5273 4.51976 6.76074 4.42297Z',
	arrowRightUp:
		'M12.4995 2.875C12.8447 2.875 13.1245 3.15482 13.1245 3.5V11C13.1245 11.3452 12.8447 11.625 12.4995 11.625C12.1545 11.6248 11.8745 11.345 11.8745 11V5.00977L3.94189 12.9424C3.6978 13.1862 3.30113 13.1864 3.05713 12.9424C2.81334 12.6984 2.81334 12.3016 3.05713 12.0576L10.9897 4.125H4.99951C4.65454 4.12476 4.37451 3.84503 4.37451 3.5C4.37451 3.15497 4.65454 2.87524 4.99951 2.875H12.4995Z',
	folder:
		'M6.5 1.875C6.72325 1.875 6.92936 1.99419 7.04102 2.1875L8.01562 3.875H14C14.8974 3.875 15.625 4.60257 15.625 5.5V12.5C15.625 13.3975 14.8975 14.125 14 14.125H2C1.10273 14.1248 0.375033 13.3973 0.375 12.5V3.5C0.374999 2.60255 1.10255 1.87502 2 1.875H6.5ZM2 3.125C1.79291 3.12502 1.625 3.29291 1.625 3.5V12.5C1.62501 12.707 1.79307 12.8748 2 12.875H14C14.2071 12.875 14.375 12.7071 14.375 12.5V5.5C14.375 5.2929 14.2071 5.125 14 5.125H7.6543C7.43116 5.12486 7.22486 5.00576 7.11328 4.8125L6.13965 3.125H2Z',
	folderOpen:
		'M5.00008 1.87483C5.15352 1.87484 5.40159 1.99739 5.49519 2.11897C5.81747 2.53758 6.13972 2.95623 6.46199 3.37483H11.7501C12.31 3.36771 12.848 3.74202 13.0382 4.26936C13.0957 4.42308 13.1252 4.58764 13.1251 4.74983V6.87483H14.6905C15.49 6.84262 16.0835 7.80206 15.6973 8.50276C14.887 10.1234 14.077 11.7445 13.2667 13.3651C13.0429 13.8232 12.546 14.1296 12.0362 14.1248H1.75008C1.01718 14.1416 0.358114 13.4828 0.375078 12.7498C0.374962 9.58319 0.375194 6.41648 0.375078 3.24983C0.358077 2.51677 1.01702 1.85784 1.75008 1.87483H5.00008ZM5.10848 8.12483C5.03296 8.12473 4.95786 8.1475 4.89559 8.19026C4.84476 8.22515 4.80344 8.27224 4.77449 8.32698C4.37803 9.08589 3.97519 9.84152 3.56551 10.5936C3.14915 11.3579 2.72402 12.1176 2.29402 12.8748H12.0362C12.0824 12.8754 12.1283 12.8471 12.1485 12.8055C12.9286 11.2453 13.7083 9.68499 14.4884 8.12483H5.10848ZM1.75008 3.12483C1.68417 3.12243 1.62266 3.18392 1.62508 3.24983C1.62518 6.12776 1.62497 9.0057 1.62508 11.8836C1.91683 11.2696 2.21173 10.6573 2.5118 10.0477C2.88997 9.27934 3.27471 8.51426 3.66609 7.75276C3.78763 7.51629 3.9699 7.3102 4.18953 7.15999C4.45752 6.97553 4.78303 6.87417 5.10848 6.87483H11.8751V4.74983C11.875 4.7334 11.8722 4.71936 11.8673 4.70589C11.8501 4.6591 11.8013 4.62358 11.7501 4.62483H6.15535C6.00192 4.62483 5.75287 4.50227 5.65926 4.38069C5.33698 3.96209 5.01473 3.54344 4.69246 3.12483H1.75008Z',
} as const;

type IconName = keyof typeof ICON_PATHS;

// Icons exported from cursor-icons with an even-odd fill rule.
const EVEN_ODD_ICON_NAMES: ReadonlySet<IconName> = new Set(['pointerArrow']);

// Category id → icon. Unmapped categories fall back to a plain square.
const CATEGORY_ICON_NAMES: Record<string, IconName> = {
	system_prompt: 'server',
	tools: 'wrench',
	rules: 'listBullets',
	skills: 'lightning',
	mcp: 'logoMcp',
	subagents: 'pointerArrow',
	summarized_conversation: 'history',
	conversation: 'chatBubble',
	uncategorized: 'square',
};

function Icon({
	name,
	size,
	color,
	style,
}: {
	name: IconName;
	size: number;
	color: string;
	style?: CSSProperties;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill={color}
			aria-hidden
			style={{ display: 'block', ...style }}
		>
			<path
				d={ICON_PATHS[name]}
				{...(EVEN_ODD_ICON_NAMES.has(name)
					? { fillRule: 'evenodd', clipRule: 'evenodd' }
					: {})}
			/>
		</svg>
	);
}
// ============================================================================
// Row primitives & indentation helpers
// ============================================================================
function rowPaddingLeft(depth: number): number {
	return ROW_PAD_X_PX + depth * ROW_INDENT_STEP_PX;
}

// Indent to the label of a leaf row that carries both a chevron box and an icon
// box (used to line an expanded code block up under the row title above it).
function rowLabelIndent(depth: number): number {
	return rowPaddingLeft(depth) + 2 * ROW_INDENT_STEP_PX;
}

function LeadingBox({ children }: { children?: ReactNode }) {
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: ROW_BOX_PX,
				height: ROW_BOX_PX,
				flexShrink: 0,
			}}
		>
			{children}
		</span>
	);
}

function RowChevron({ open, color }: { open: boolean; color: string }) {
	return (
		<Icon
			name="triangleSmallRight"
			size={ROW_ICON_PX}
			color={color}
			style={{
				transform: open ? 'rotate(90deg)' : 'none',
				transition: 'transform 120ms ease',
			}}
		/>
	);
}

function RowArrow({ color }: { color: string }) {
	return (
		<Icon
			name="arrowRightUp"
			size={12}
			color={color}
			style={{ flexShrink: 0 }}
		/>
	);
}

function RowTrailing({ children }: { children?: ReactNode }) {
	const { tokens: themeTokens } = useHostTheme();
	return (
		<span
			style={{
				flexShrink: 0,
				color: themeTokens.text.tertiary,
				fontVariantNumeric: 'tabular-nums',
			}}
		>
			{children}
		</span>
	);
}

// The flex-1 label cluster: an ellipsizing label, an optional inline count, and
// (when `action` is set) link affordances — pointer cursor, hover underline,
// and a trailing arrow. Owns its own hover state so callers stay simple.
function RowLabel({
	label,
	count,
	action,
}: {
	label: ReactNode;
	count?: number;
	action?: { title: string; ariaLabel: string; onAction: () => void };
}) {
	const { tokens: themeTokens } = useHostTheme();
	const [linkHovered, setLinkHovered] = useState(false);
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				flex: 1,
				minWidth: 0,
			}}
		>
			<span
				role={action !== undefined ? 'link' : undefined}
				tabIndex={action !== undefined ? 0 : undefined}
				title={action?.title}
				aria-label={action?.ariaLabel}
				onClick={
					action !== undefined
						? (event) => {
							event.stopPropagation();
							action.onAction();
						}
						: undefined
				}
				onKeyDown={
					action !== undefined
						? (event) => {
							if (event.key !== 'Enter' && event.key !== ' ') {
								return;
							}
							event.preventDefault();
							event.stopPropagation();
							action.onAction();
						}
						: undefined
				}
				onMouseEnter={
					action !== undefined ? () => setLinkHovered(true) : undefined
				}
				onMouseLeave={
					action !== undefined ? () => setLinkHovered(false) : undefined
				}
				style={{
					minWidth: 0,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					...(action !== undefined ? { cursor: 'pointer' } : {}),
					...(action !== undefined && linkHovered
						? {
							textDecoration: 'underline',
							textUnderlineOffset: 2,
						}
						: {}),
				}}
			>
				{label}
			</span>
			{action !== undefined ? (
				<RowArrow color={themeTokens.text.quaternary} />
			) : null}
			{count !== undefined ? (
				<span
					style={{
						flexShrink: 0,
						color: themeTokens.text.tertiary,
					}}
				>
					{count}
				</span>
			) : null}
		</span>
	);
}

// ============================================================================
// Tree row — the shared collapsible/leaf row used throughout the breakdown.
// ============================================================================
function ContextUsageTreeRow({
	label,
	trailing,
	leading,
	labelAction,
	open: controlledOpen,
	onOpenChange,
	defaultOpen = false,
	children,
	depth = 0,
	count,
	guide = false,
}: {
	label: ReactNode;
	trailing?: ReactNode;
	leading?: ReactNode | ((open: boolean) => ReactNode);
	labelAction?: {
		title: string;
		ariaLabel: string;
		onAction: () => void;
	};
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultOpen?: boolean;
	children?: ReactNode;
	depth?: number;
	count?: number;
	guide?: boolean;
}) {
	const { tokens: themeTokens } = useHostTheme();
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const [hovered, setHovered] = useState(false);
	const hasChildren = children !== undefined && children !== null;
	const open = controlledOpen ?? uncontrolledOpen;
	const resolvedLeading =
		typeof leading === 'function' ? leading(open) : leading;
	const hasLeading = resolvedLeading !== undefined && resolvedLeading !== null;
	const toggle = useCallback(() => {
		if (!hasChildren) {
			return;
		}
		const nextOpen = !open;
		if (onOpenChange !== undefined) {
			onOpenChange(nextOpen);
			return;
		}
		setUncontrolledOpen(nextOpen);
	}, [hasChildren, onOpenChange, open]);

	const rowStyle = {
		display: 'flex',
		alignItems: 'center',
		columnGap: ROW_GAP_PX,
		width: '100%',
		minWidth: 0,
		minHeight: ROW_MIN_HEIGHT_PX,
		paddingLeft: rowPaddingLeft(depth),
		paddingRight: ROW_PAD_X_PX,
		boxSizing: 'border-box' as const,
		color: themeTokens.text.primary,
		borderRadius: ROW_BORDER_RADIUS_PX,
		// Background wash is reserved for collapsible rows. Linked and inert
		// leaf rows stay flat; links signal clickability with a hover underline.
		background:
			hovered && hasChildren ? themeTokens.fill.quaternary : 'transparent',
	};

	const headerContent = (
		<>
			{/* Chevron gutter is always reserved (empty for non-expandable rows)
			    so a row's icon lands in the same column as its header's icon. */}
			<LeadingBox>
				{hasChildren ? (
					<RowChevron open={open} color={themeTokens.text.secondary} />
				) : null}
			</LeadingBox>
			{hasLeading ? <LeadingBox>{resolvedLeading}</LeadingBox> : null}
			<RowLabel label={label} count={count} action={labelAction} />
			<RowTrailing>{trailing}</RowTrailing>
		</>
	);

	return (
		<div style={{ width: '100%', minWidth: 0 }}>
			{hasChildren ? (
				<button
					type="button"
					aria-expanded={open}
					onClick={toggle}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					onFocus={() => setHovered(true)}
					onBlur={() => setHovered(false)}
					style={{
						...rowStyle,
						appearance: 'none',
						border: 'none',
						cursor: 'pointer',
						font: 'inherit',
						textAlign: 'left',
					}}
				>
					{headerContent}
				</button>
			) : (
				<div
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					onFocus={() => setHovered(true)}
					onBlur={() => setHovered(false)}
					style={rowStyle}
				>
					{headerContent}
				</div>
			)}
			{hasChildren && open ? (
				<div
					style={{
						position: guide ? 'relative' : undefined,
						minWidth: 0,
					}}
				>
					{guide ? (
						<div
							aria-hidden
							style={{
								position: 'absolute',
								left: rowPaddingLeft(depth) + ROW_BOX_PX / 2,
								top: 0,
								bottom: 0,
								width: 1,
								background: themeTokens.stroke.tertiary,
							}}
						/>
					) : null}
					{children}
				</div>
			) : null}
		</div>
	);
}

// ============================================================================
// Category data transforms — grouping, sorting, and timeline ordering.
// ============================================================================
function getLargestCategory(
	categories: ContextUsageCanvasCategory[],
): ContextUsageCanvasCategory | undefined {
	if (categories.length === 0) {
		return undefined;
	}
	return [...categories].sort((a, b) => b.tokens - a.tokens)[0];
}

function groupItemsByCategory(
	items: readonly ContextUsageCanvasItem[] | undefined,
): Map<string, ContextUsageCanvasItem[]> {
	const grouped = new Map<string, ContextUsageCanvasItem[]>();
	for (const item of items ?? []) {
		const existing = grouped.get(item.categoryId);
		if (existing !== undefined) {
			existing.push(item);
			continue;
		}
		grouped.set(item.categoryId, [item]);
	}
	for (const categoryItems of grouped.values()) {
		categoryItems.sort(
			(a, b) => getItemEstimatedTokens(b) - getItemEstimatedTokens(a),
		);
	}
	return grouped;
}

type CategoryItemGroup = {
	readonly groupId: string;
	readonly title: string;
	readonly children: readonly ContextUsageCanvasItem[];
};

const TOOL_DEFINITION_DESCRIPTIONS: Readonly<Record<string, string>> = {
	SemanticSearch:
		'Finds code by meaning rather than exact wording, so the agent can locate the right place even without knowing the precise name. Best for exploring an unfamiliar codebase.',
	Shell:
		'Runs commands in the terminal — tests, builds, scripts, git, and more — and reads back their output.',
	SetActiveBranch:
		'Tells Cursor which branch you are working on so it shows the right changes and related pull requests.',
	UpdatePrCodeTour:
		'Regenerates a pull request’s guided code tour when you ask to shorten, expand, or refocus it.',
	Grep: 'Searches the codebase for exact text or a pattern and lists every place it appears.',
	Delete: 'Removes a file from your workspace.',
	WebSearch:
		'Searches the web for current information that may not be in the agent’s training data, like recent releases or events.',
	WebFetch:
		'Opens a web page and reads its contents into the conversation so the agent can use what is on it.',
	GenerateImage:
		'Creates an image from a written description. Only used when you explicitly ask for a picture or mockup.',
	ReadLints:
		'Surfaces the errors and warnings the editor has flagged in your files.',
	EditNotebook: 'Edits a single cell in a Jupyter notebook.',
	TodoWrite:
		'Keeps a running checklist of the steps the agent is working through on a larger task.',
	StrReplace: 'Makes a precise, targeted edit to part of an existing file.',
	MultiStrReplace:
		'Makes several targeted edits to a file in one pass, instead of one change at a time.',
	ApplyPatch:
		'Applies a batch of edits described as a patch — adding, removing, and changing lines across a file.',
	Write: 'Creates a new file or overwrites an existing one.',
	Read: 'Opens a file, image, or PDF from your workspace so the agent can read it.',
	Glob: 'Finds files by name or location using a path pattern.',
	LS: 'Lists the files and folders inside a directory.',
	CreatePlan:
		'Writes a structured, multi-step plan for a larger task so the work is laid out before editing begins.',
	WriteShellStdin:
		'Types input into a running terminal command — handy for interactive prompts and REPLs.',
	AskQuestion:
		'Presents you with a set of choices and waits for your answer before continuing.',
	Task: 'Hands a focused piece of work to a separate agent that works on its own.',
	Await: 'Checks in on a long-running command to see how far along it is.',
	FetchMcpResource:
		'Reads data made available by a connected integration (an MCP server).',
	ListMcpResources:
		'Lists the read-only data resources a connected integration (MCP server) exposes.',
	GetMcpTools:
		'Discovers the tools and input schemas offered by connected integrations (MCP servers) before calling them.',
	mcp_auth:
		'Signs in to a connected integration (MCP server) when it needs authentication.',
	SwitchMode:
		'Switches between planning and hands-on editing modes to match the task.',
	CallMcpTool:
		'Runs an action provided by a connected integration (an MCP server).',
	request_user_help:
		'Hands control back to you for steps the agent cannot do itself, like logging in or solving a captcha.',
};

// Static folder titles for grouped categories, keyed by full group id. Tool-call
// pair groups are titled dynamically (see getToolCallPairGroupTitle).
const GROUP_TITLES: Readonly<Record<string, string>> = {
	'rules:project-rules': 'Project Rules',
	'rules:team-rules': 'Team Rules',
	'skills:cursor-skills': 'Cursor Skills',
	'skills:user-skills': 'User Skills',
	'skills:workspace-skills': 'Workspace Skills',
	'skills:plugin-skills': 'Plugin Skills',
	'skills:other-skills': 'Other',
	'mcp:cursor': 'Cursor MCPs',
	'mcp:user': 'User MCPs',
	'mcp:team': 'Team MCPs',
	'mcp:plugin': 'Plugin MCPs',
	'mcp:other': 'Other MCPs',
};

const LEGACY_TOOL_PREFIX_RE = /^Tool:\s*(.+)$/i;
const TOOL_SUFFIX_RE = /\sTool$/i;

function normalizeToolCallGroupLabel(label: string): string {
	const trimmed = label.trim();
	const legacyPrefix = LEGACY_TOOL_PREFIX_RE.exec(trimmed);
	if (legacyPrefix !== null) {
		return `${legacyPrefix[1]} Tool`;
	}
	if (TOOL_SUFFIX_RE.test(trimmed)) {
		return trimmed;
	}
	return `${trimmed} Tool`;
}

function getToolCallPairGroupTitle(
	children: readonly ContextUsageCanvasItem[],
	overviewLabel?: string,
): string {
	if (overviewLabel !== undefined && overviewLabel.length > 0) {
		return normalizeToolCallGroupLabel(overviewLabel);
	}

	const call = children.find((child) => child.label === 'Call');
	if (call !== undefined) {
		try {
			const args = JSON.parse(call.text) as {
				toolName?: string;
				name?: string;
			};
			const name = args.toolName ?? args.name;
			if (typeof name === 'string' && name.length > 0) {
				return `${name} Tool`;
			}
		} catch {
			// fall through
		}
	}

	return 'Tool call';
}

function formatConversationItemLabel(item: ContextUsageCanvasItem): string {
	if (!item.id.startsWith('message:')) {
		return item.label;
	}
	const normalized = item.label.trim().toLowerCase();
	if (normalized.startsWith('user message')) {
		return 'User Message';
	}
	if (normalized.startsWith('assistant message')) {
		return 'Agent Message';
	}
	return item.label;
}

function formatSourceItemLabel(item: ContextUsageCanvasItem): string {
	if (item.source?.kind === 'file') {
		return item.source.label;
	}
	return formatConversationItemLabel(item);
}

function partitionCategoryItems(
	items: readonly ContextUsageCanvasItem[],
	toolCallGroupLabels?: Readonly<Record<string, string>>,
): {
	readonly roots: readonly ContextUsageCanvasItem[];
	readonly groups: readonly CategoryItemGroup[];
} {
	const groupsByParentId = new Map<string, ContextUsageCanvasItem[]>();
	const roots: ContextUsageCanvasItem[] = [];

	for (const item of items) {
		const parentId = item.parentId;
		if (parentId !== undefined && !parentId.startsWith('category:')) {
			const existing = groupsByParentId.get(parentId);
			if (existing !== undefined) {
				existing.push(item);
				continue;
			}
			groupsByParentId.set(parentId, [item]);
			continue;
		}
		roots.push(item);
	}

	const groups: CategoryItemGroup[] = [];
	for (const [groupId, children] of groupsByParentId) {
		const sortedChildren = [...children].sort((a, b) => {
			if (a.label === 'Call' && b.label === 'Result') {
				return -1;
			}
			if (a.label === 'Result' && b.label === 'Call') {
				return 1;
			}
			return getItemEstimatedTokens(b) - getItemEstimatedTokens(a);
		});
		groups.push({
			groupId,
			title:
				GROUP_TITLES[groupId] ??
				getToolCallPairGroupTitle(
					sortedChildren,
					toolCallGroupLabels?.[groupId],
				),
			children: sortedChildren,
		});
	}

	groups.sort(
		(a, b) =>
			Math.max(...b.children.map((child) => getItemEstimatedTokens(child))) -
			Math.max(...a.children.map((child) => getItemEstimatedTokens(child))),
	);

	roots.sort((a, b) => getItemEstimatedTokens(b) - getItemEstimatedTokens(a));

	return { roots, groups };
}

type CategoryDisplayEntry =
	| { kind: 'item'; item: ContextUsageCanvasItem; weight: number }
	| { kind: 'group'; group: CategoryItemGroup; weight: number };

type ConversationTurnDisplayEntry = {
	readonly turnId: string;
	readonly title: string;
	readonly entries: readonly CategoryDisplayEntry[];
	readonly tokens: number;
};

function getConversationTimelineIndex(entry: CategoryDisplayEntry): number {
	if (entry.kind === 'item') {
		return parseConversationTimelineIndex(entry.item.id);
	}
	return parseConversationTimelineIndex(entry.group.groupId);
}

const MESSAGE_TIMELINE_RE = /^message:(\d+):/;
const TOOL_CALL_TIMELINE_RE = /^tool_call_pair:(\d+):/;

function parseConversationTimelineIndex(id: string): number {
	const messageMatch = MESSAGE_TIMELINE_RE.exec(id);
	if (messageMatch !== null) {
		return Number(messageMatch[1]);
	}
	const toolCallMatch = TOOL_CALL_TIMELINE_RE.exec(id);
	if (toolCallMatch !== null) {
		return Number(toolCallMatch[1]);
	}
	return Number.MAX_SAFE_INTEGER;
}

function getConversationTimelineKindRank(entry: CategoryDisplayEntry): number {
	if (entry.kind === 'item' && entry.item.id.startsWith('message:')) {
		return 0;
	}
	if (entry.kind === 'group') {
		return 1;
	}
	return 2;
}

function compareConversationTimelineEntries(
	a: CategoryDisplayEntry,
	b: CategoryDisplayEntry,
): number {
	const indexDelta =
		getConversationTimelineIndex(a) - getConversationTimelineIndex(b);
	if (indexDelta !== 0) {
		return indexDelta;
	}
	const kindDelta = getConversationTimelineKindRank(a) - getConversationTimelineKindRank(b);
	if (kindDelta !== 0) {
		return kindDelta;
	}
	const idA = a.kind === 'item' ? a.item.id : a.group.groupId;
	const idB = b.kind === 'item' ? b.item.id : b.group.groupId;
	return idA.localeCompare(idB);
}

function getCategoryDisplayEntryTokens(entry: CategoryDisplayEntry): number {
	if (entry.kind === 'item') {
		return getItemEstimatedTokens(entry.item);
	}
	return entry.group.children.reduce(
		(sum, child) => sum + getItemEstimatedTokens(child),
		0,
	);
}

function isConversationUserMessageEntry(entry: CategoryDisplayEntry): boolean {
	return (
		entry.kind === 'item' &&
		entry.item.id.startsWith('message:') &&
		formatConversationItemLabel(entry.item) === 'User Message'
	);
}

function buildConversationTurnDisplayEntries(
	entries: readonly CategoryDisplayEntry[],
): readonly ConversationTurnDisplayEntry[] {
	type MutableTurn = {
		turnId: string;
		title: string;
		entries: CategoryDisplayEntry[];
		tokens: number;
		startUserMessageIndex?: number;
	};

	const turns: MutableTurn[] = [];
	let currentTurn: MutableTurn | undefined;
	let turnCount = 0;

	const createTurn = (
		title: string,
		turnId: string,
		startUserMessageIndex?: number,
	): MutableTurn => {
		const turn: MutableTurn = {
			turnId,
			title,
			entries: [],
			tokens: 0,
			...(startUserMessageIndex !== undefined ? { startUserMessageIndex } : {}),
		};
		turns.push(turn);
		return turn;
	};

	for (const entry of entries) {
		if (isConversationUserMessageEntry(entry)) {
			const messageIndex = getConversationTimelineIndex(entry);
			if (currentTurn?.startUserMessageIndex !== messageIndex) {
				turnCount++;
				currentTurn = createTurn(
					'Turn ' + turnCount,
					'conversation-turn:' + messageIndex,
					messageIndex,
				);
			}
		}

		if (currentTurn === undefined) {
			currentTurn = createTurn(
				'Before first user message',
				'conversation-turn:before-first-user-message',
			);
		}

		currentTurn.entries.push(entry);
		currentTurn.tokens += getCategoryDisplayEntryTokens(entry);
	}

	return turns;
}

function buildCategoryDisplayEntries(
	roots: readonly ContextUsageCanvasItem[],
	groups: readonly CategoryItemGroup[],
	categoryId: string,
): readonly CategoryDisplayEntry[] {
	const entries: CategoryDisplayEntry[] = [
		...roots.map((item) => ({
			kind: 'item' as const,
			item,
			weight: getItemEstimatedTokens(item),
		})),
		...groups.map((group) => ({
			kind: 'group' as const,
			group,
			weight: group.children.reduce(
				(sum, child) => sum + getItemEstimatedTokens(child),
				0,
			),
		})),
	];
	// Every category is ordered by token use (largest first). The conversation
	// bucket is the only exception: it preserves chronological turn order.
	if (categoryId === 'conversation') {
		entries.sort(compareConversationTimelineEntries);
	} else {
		entries.sort((a, b) => b.weight - a.weight);
	}
	return entries;
}

// Inline anchor styled like the rest: normal (inherited) color, underline only
// while the link itself is hovered. Never the default blue link color.
// ============================================================================
// Category & breakdown UI
// ============================================================================
function InlineLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	const [hovered, setHovered] = useState(false);
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				color: 'inherit',
				textDecoration: hovered ? 'underline' : 'none',
				textUnderlineOffset: 2,
			}}
		>
			{children}
		</a>
	);
}

function CategorySectionIntro({ categoryId }: { categoryId: string }) {
	if (categoryId === 'skills') {
		return (
			<Text tone="secondary">
				{getCategoryHelpText('skills')} You can turn this off per skill with{' '}
				<InlineLink href="https://cursor.com/docs/skills#frontmatter-fields">
					disable-model-invocation
				</InlineLink>
				.
			</Text>
		);
	}
	return <Text tone="secondary">{getCategoryHelpText(categoryId)}</Text>;
}

function CategoryIcon({
	categoryId,
	color,
}: {
	categoryId: string;
	color: string;
}) {
	return (
		<Icon
			name={CATEGORY_ICON_NAMES[categoryId] ?? 'square'}
			size={ROW_ICON_PX}
			color={color}
		/>
	);
}

function CategoryDescriptionRow({ categoryId }: { categoryId: string }) {
	return (
		<div
			style={{
				width: '100%',
				minWidth: 0,
				boxSizing: 'border-box',
				paddingLeft: ROW_PAD_X_PX + 6,
				paddingRight: ROW_PAD_X_PX,
				paddingTop: 12,
				paddingBottom: 4,
				marginBottom: 8,
			}}
		>
			<CategorySectionIntro categoryId={categoryId} />
		</div>
	);
}

function CategoryCollapsibleSection({
	category,
	sectionCount,
	open,
	onOpenChange,
	children,
	showTokensUnit = false,
}: {
	category: ContextUsageCanvasCategory;
	sectionCount: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
	showTokensUnit?: boolean;
}) {
	const theme = useHostTheme();
	const accent = theme.category[toSwatchColor(category.color)];
	const background = `color-mix(in srgb, ${theme.fill.quaternary} 95%, ${accent} 5%)`;

	return (
		<div style={{ minWidth: 0 }}>
			<div
				style={{
					background,
					borderRadius: ROW_BORDER_RADIUS_PX,
					minWidth: 0,
				}}
			>
				<button
					type="button"
					aria-expanded={open}
					onClick={() => onOpenChange(!open)}
					style={{
						display: 'flex',
						alignItems: 'center',
						columnGap: ROW_GAP_PX,
						width: '100%',
						minWidth: 0,
						minHeight: ROW_MIN_HEIGHT_PX,
						paddingLeft: ROW_PAD_X_PX,
						paddingRight: ROW_PAD_X_PX,
						boxSizing: 'border-box',
						color: theme.text.primary,
						background: 'transparent',
						border: 'none',
						appearance: 'none',
						cursor: 'pointer',
						font: 'inherit',
						textAlign: 'left',
					}}
				>
					<LeadingBox>
						<RowChevron open={open} color={theme.text.secondary} />
					</LeadingBox>
					<LeadingBox>
						<CategoryIcon categoryId={category.id} color={accent} />
					</LeadingBox>
					<RowLabel
						label={category.label}
						count={sectionCount > 0 ? sectionCount : undefined}
					/>
					<RowTrailing>
						{showTokensUnit
							? `${formatTokenLabel(category.tokens)} tokens`
							: formatTokenLabel(category.tokens)}
					</RowTrailing>
				</button>
			</div>
			{open ? (
				<div style={{ paddingTop: 4, minWidth: 0 }}>
					<CategoryDescriptionRow categoryId={category.id} />
					{children}
				</div>
			) : null}
		</div>
	);
}

// Subagent descriptions arrive as "name: description", sometimes with a leading
// markdown bullet ("- name: description"). Drop the bullet and the leading name
// (and its colon) since the row already shows the name as its label.
function stripLeadingLabel(label: string, text: string): string {
	let trimmed = text.trimStart();
	if (trimmed.startsWith('- ')) {
		trimmed = trimmed.slice(2).trimStart();
	}
	if (
		label.length > 0 &&
		trimmed.toLowerCase().startsWith(label.toLowerCase())
	) {
		const rest = trimmed.slice(label.length).trimStart();
		return rest.startsWith(':') ? rest.slice(1).trimStart() : rest;
	}
	return trimmed;
}

function getDisplayText(text: string): string {
	// Many entries arrive as markdown list items; drop a single leading "- "
	// bullet so the body reads cleanly. Counts use the original text upstream.
	const trimmedStart = text.trimStart();
	const value = trimmedStart.startsWith('- ')
		? trimmedStart.slice(2)
		: text;
	if (value.length <= 8000) {
		return value;
	}
	return `${value.slice(0, 8000)}\n\n… truncated for display`;
}

function toSwatchColor(color: string | undefined): Color {
	if (
		color === 'gray' ||
		color === 'purple' ||
		color === 'green' ||
		color === 'yellow' ||
		color === 'pink' ||
		color === 'blue' ||
		color === 'orange'
	) {
		return color;
	}
	return 'gray';
}

function ContextUsageItemBody({ item }: { item: ContextUsageCanvasItem }) {
	const { tokens: themeTokens } = useHostTheme();
	const boxStyle: CSSProperties = {
		boxSizing: 'border-box',
		marginTop: 4,
		marginBottom: 4,
		// Pull left by the box padding so the text inside lines up with the row
		// label above; the right edge stays flush with the end of the table.
		marginLeft: -ROW_PAD_X_PX,
		background: themeTokens.bg.editor,
		border: `1px solid ${themeTokens.stroke.tertiary}`,
		borderRadius: ROW_BORDER_RADIUS_PX,
		padding: `10px ${ROW_PAD_X_PX}px`,
	};
	return (
		<div style={boxStyle}>
			<Text
				size="small"
				tone="secondary"
				style={{
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					lineHeight: '1.6',
				}}
			>
				{getDisplayText(item.text)}
			</Text>
		</div>
	);
}

function ToolDefinitionRow({
	item,
	depth,
}: {
	item: ContextUsageCanvasItem;
	depth: number;
}) {
	const { tokens: themeTokens } = useHostTheme();
	const description = TOOL_DEFINITION_DESCRIPTIONS[item.label];
	return (
		<ContextUsageTreeRow
			label={item.label}
			depth={depth}
			leading={
				<CategoryIcon categoryId="tools" color={themeTokens.text.tertiary} />
			}
			trailing={formatItemTrailing(item)}
		>
			{description !== undefined ? (
				<div
					style={{
						paddingLeft: rowLabelIndent(depth),
						paddingRight: ROW_PAD_X_PX,
						paddingTop: 4,
						paddingBottom: 10,
						minWidth: 0,
					}}
				>
					<Text tone="secondary">{description}</Text>
				</div>
			) : undefined}
		</ContextUsageTreeRow>
	);
}

function FolderIcon({ open }: { open: boolean }) {
	const { tokens: themeTokens } = useHostTheme();
	return (
		<Icon
			name={open ? 'folderOpen' : 'folder'}
			size={ROW_ICON_PX}
			color={themeTokens.text.tertiary}
		/>
	);
}

function isFolderGroup(groupId: string): boolean {
	return (
		groupId.startsWith('rules:') ||
		groupId.startsWith('skills:') ||
		groupId.startsWith('mcp:')
	);
}

function CategoryEntriesList({
	entries,
	categoryId,
	depth,
}: {
	entries: readonly CategoryDisplayEntry[];
	categoryId: string;
	depth: number;
}) {
	const dispatch = useCanvasAction();
	const { tokens: themeTokens } = useHostTheme();
	const fileLabelAction = (item: ContextUsageCanvasItem) => {
		if (item.source?.kind !== 'file') {
			return undefined;
		}
		const { path, label } = item.source;
		return {
			title: path,
			ariaLabel: `Open ${label}`,
			onAction: () =>
				dispatch({
					type: 'openFile',
					path,
				}),
		};
	};

	const isItemExpandable = (item: ContextUsageCanvasItem) =>
		item.source?.kind !== 'file' && item.text.length > 0;

	// Inside a conversation turn, a few rows get a more specific glyph than the
	// generic chat bubble: tool calls use the wrench, and the user's own turn
	// uses a horizontally-flipped bubble so it points the other way.
	const renderItemLeading = (label: string) => {
		const iconColor = themeTokens.text.tertiary;
		if (categoryId === 'conversation') {
			if (label.toLowerCase().startsWith('tool')) {
				return <Icon name="wrench" size={ROW_ICON_PX} color={iconColor} />;
			}
			if (label === 'User Message') {
				return (
					<Icon
						name="chatBubble"
						size={ROW_ICON_PX}
						color={iconColor}
						style={{ transform: 'scaleX(-1)' }}
					/>
				);
			}
		}
		return <CategoryIcon categoryId={categoryId} color={iconColor} />;
	};

	const renderItemRow = (
		item: ContextUsageCanvasItem,
		options: { defaultOpen?: boolean; depth: number },
	) => (
		<ContextUsageTreeRow
			label={formatSourceItemLabel(item)}
			labelAction={fileLabelAction(item)}
			defaultOpen={options.defaultOpen}
			depth={options.depth}
			leading={renderItemLeading(formatSourceItemLabel(item))}
			trailing={formatItemTrailing(item)}
		>
			{item.source?.kind !== 'file' && item.text.length > 0 ? (
				categoryId === 'subagents' ? (
					<div
						style={{
							paddingLeft: rowLabelIndent(options.depth),
							paddingRight: ROW_PAD_X_PX,
							paddingTop: 4,
							paddingBottom: 10,
							minWidth: 0,
						}}
					>
						<Text tone="secondary">
							{stripLeadingLabel(formatSourceItemLabel(item), item.text)}
						</Text>
					</div>
				) : (
					<div
						style={{
							paddingLeft: rowLabelIndent(options.depth),
							paddingRight: 0,
							minWidth: 0,
						}}
					>
						<ContextUsageItemBody item={item} />
					</div>
				)
			) : null}
		</ContextUsageTreeRow>
	);

	const renderEntry = (entry: CategoryDisplayEntry) => {
		if (entry.kind === 'item') {
			return categoryId === 'tools' ? (
				<div key={entry.item.id}>
					<ToolDefinitionRow item={entry.item} depth={depth} />
				</div>
			) : (
				<div key={entry.item.id}>{renderItemRow(entry.item, { depth })}</div>
			);
		}
		const isFolder = isFolderGroup(entry.group.groupId);
		// Folders sit flush with the category header (no left padding) so their
		// chevron/icon line up with it. Leaf children share the group's icon
		// column (reserved gutter keeps icons aligned). But if children can
		// themselves expand, their chevrons would land in the same column as the
		// folder's guide line and overlap it, so those get indented one level.
		const childrenExpandable = entry.group.children.some(isItemExpandable);
		const groupDepth = isFolder ? 0 : depth;
		const childDepth =
			isFolder && childrenExpandable ? groupDepth + 1 : groupDepth;
		return (
			<div key={entry.group.groupId}>
				<ContextUsageTreeRow
					depth={groupDepth}
					label={entry.group.title}
					count={isFolder ? entry.group.children.length : undefined}
					leading={
						isFolder
							? (groupOpen) => <FolderIcon open={groupOpen} />
							: undefined
					}
					guide={isFolder}
					defaultOpen={false}
					trailing={formatGroupTrailing(entry.group.children)}
				>
					<Stack gap={4}>
						{entry.group.children.map((child) => (
							<div key={child.id}>
								{renderItemRow(child, {
									defaultOpen: false,
									depth: childDepth,
								})}
							</div>
						))}
					</Stack>
				</ContextUsageTreeRow>
			</div>
		);
	};

	return (
		<Stack gap={4}>
			{entries.map(renderEntry)}
		</Stack>
	);
}

function ConversationTurnEntriesList({
	turns,
	categoryId,
}: {
	turns: readonly ConversationTurnDisplayEntry[];
	categoryId: string;
}) {
	return (
		<Stack gap={4}>
			{turns.map((turn) => (
				<ConversationTurnRow
					key={turn.turnId}
					turn={turn}
					categoryId={categoryId}
				/>
			))}
		</Stack>
	);
}

function ConversationTurnRow({
	turn,
	categoryId,
}: {
	turn: ConversationTurnDisplayEntry;
	categoryId: string;
}) {
	const { tokens: themeTokens } = useHostTheme();
	const [open, setOpen] = useState(false);
	// Render each turn as a flush folder (chat-bubbles icon + chevron, no left
	// padding), exactly like the folders inside Rules / Skills / MCP.
	return (
		<ContextUsageTreeRow
			label={turn.title}
			count={turn.entries.length}
			trailing={formatTokenLabel(turn.tokens)}
			open={open}
			onOpenChange={setOpen}
			depth={0}
			leading={
				<Icon
					name="chatBubbles"
					size={ROW_ICON_PX}
					color={themeTokens.text.tertiary}
				/>
			}
			guide
		>
			<CategoryEntriesList
				entries={turn.entries}
				categoryId={categoryId}
				depth={1}
			/>
		</ContextUsageTreeRow>
	);
}

function CategoryItems({
	items,
	categoryId,
	toolCallGroupLabels,
	depth,
}: {
	items: readonly ContextUsageCanvasItem[];
	categoryId: string;
	toolCallGroupLabels?: Readonly<Record<string, string>>;
	depth: number;
}) {
	const { roots, groups } = partitionCategoryItems(
		items,
		toolCallGroupLabels,
	);
	const entries = buildCategoryDisplayEntries(
		roots,
		groups,
		categoryId,
	);

	if (categoryId === 'conversation') {
		return (
			<ConversationTurnEntriesList
				turns={buildConversationTurnDisplayEntries(entries)}
				categoryId={categoryId}
			/>
		);
	}

	return (
		<CategoryEntriesList
			entries={entries}
			categoryId={categoryId}
			depth={depth}
		/>
	);
}

const CONTEXT_REDUCTION_PROMPT =
	'Read this context usage canvas and its corresponding data. Are there any opportunities to reduce context usage? Feel free to update the canvas to call out specific items or opportunities if helpful.';
function AskAboutContextUsage() {
	const dispatch = useCanvasAction();
	return (
		<Button
			onClick={() =>
				dispatch({
					type: 'newComposerChat',
					userPrompt: CONTEXT_REDUCTION_PROMPT,
				})
			}
		>
			{COPY.debugButton}
		</Button>
	);
}

// ============================================================================
// Header
// ============================================================================
function ContextUsageHeader({
	chatName,
	composerId,
}: {
	chatName: string;
	composerId?: string;
}) {
	const dispatch = useCanvasAction();
	const { tokens: themeTokens } = useHostTheme();
	const trimmedComposerId = composerId?.trim();
	const canOpenChat =
		trimmedComposerId !== undefined && trimmedComposerId.length > 0;

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				width: '100%',
				minWidth: 0,
				boxSizing: 'border-box',
			}}
		>
			<div
				style={{
					flex: 1,
					minWidth: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: 6,
				}}
			>
				<span
					style={{
						...META_LABEL_TEXT,
						color: themeTokens.text.tertiary,
					}}
				>
					{COPY.eyebrow}
				</span>
				{canOpenChat ? (
					<span
						role="link"
						tabIndex={0}
						title={COPY.openChat}
						aria-label={COPY.openChat}
						onClick={() =>
							dispatch({
								type: 'openAgent',
								agentId: trimmedComposerId,
							})
						}
						onKeyDown={(event) => {
							if (event.key !== 'Enter' && event.key !== ' ') {
								return;
							}
							event.preventDefault();
							dispatch({
								type: 'openAgent',
								agentId: trimmedComposerId,
							});
						}}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							minWidth: 0,
							maxWidth: '100%',
							alignSelf: 'flex-start',
							cursor: 'pointer',
						}}
					>
						<span
							style={{
								...TITLE_TEXT,
								minWidth: 0,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								color: themeTokens.text.primary,
							}}
						>
							{chatName}
						</span>
						<Icon
							name="arrowRightUp"
							size={18}
							color={themeTokens.text.quaternary}
							style={{ flexShrink: 0 }}
						/>
					</span>
				) : (
				<span
					style={{
						...TITLE_TEXT,
						minWidth: 0,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						color: themeTokens.text.primary,
					}}
				>
					{chatName}
				</span>
				)}
			</div>
		</div>
	);
}

function HeaderMetaChunk({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	const { tokens: themeTokens } = useHostTheme();
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				flex: 1,
				minWidth: 0,
			}}
		>
			<span
				style={{
					...META_LABEL_TEXT,
					color: themeTokens.text.tertiary,
				}}
			>
				{label}
			</span>
			<span
				style={{
					fontSize: 15,
					lineHeight: '20px',
					color: themeTokens.text.primary,
					fontVariantNumeric: 'tabular-nums',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{value}
			</span>
		</div>
	);
}

// ============================================================================
// Donut chart
// ============================================================================
const CONTEXT_PIE_SIZE_PX = 240;
const CONTEXT_PIE_STROKE_WIDTH_PX = 32;
const CONTEXT_PIE_SLICE_GAP_PX = 2;
const CONTEXT_PIE_REMAINDER_ID = '__remainder';

function ContextUsagePie({
	segments,
	total,
	percentLabel,
}: {
	segments: readonly { id: string; label: string; value: number; color?: Color }[];
	total: number;
	percentLabel: string;
}) {
	const theme = useHostTheme();
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const size = CONTEXT_PIE_SIZE_PX;
	const strokeWidth = CONTEXT_PIE_STROKE_WIDTH_PX;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const center = size / 2;

	const safeTotal = total > 0 ? total : 0;
	const used = segments.reduce(
		(sum, segment) => sum + (segment.value > 0 ? segment.value : 0),
		0,
	);
	const remainder = Math.max(0, safeTotal - used);
	const denom = safeTotal > 0 ? safeTotal : used > 0 ? used : 1;

	// Colored category arcs fill up to the used portion; a muted remainder arc
	// completes the ring so the donut reads as "share of the whole window".
	const ringSlices = [
		...segments
			.filter((segment) => segment.value > 0)
			.map((segment) => ({
				id: segment.id,
				label: segment.label,
				value: segment.value,
				color: theme.category[segment.color ?? 'gray'],
				interactive: true,
			})),
		...(remainder > 0
			? [
				{
					id: CONTEXT_PIE_REMAINDER_ID,
					label: '',
					value: remainder,
					color: theme.fill.tertiary,
					interactive: false,
				},
			]
			: []),
	];
	const gap = ringSlices.length > 1 ? CONTEXT_PIE_SLICE_GAP_PX : 0;

	let startLength = 0;
	const arcs = ringSlices.map((slice) => {
		const fraction = slice.value / denom;
		const fullLength = fraction * circumference;
		const dash = Math.max(0, fullLength - gap);
		const dashOffset = -startLength;
		startLength += fullLength;
		return { ...slice, dash, dashOffset };
	});

	// On hover, the center shows the hovered category and its share of the
	// window; otherwise it shows the overall fill.
	const hoveredSegment = segments.find((segment) => segment.id === hoveredId);
	const centerValue =
		hoveredSegment !== undefined
			? `${Math.round((hoveredSegment.value / denom) * 100)}%`
			: percentLabel;
	const centerCaption =
		hoveredSegment !== undefined ? hoveredSegment.label : COPY.donutCaption;

	return (
		<div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
			<div style={{ position: 'relative', width: size, height: size }}>
				<svg
					width={size}
					height={size}
					viewBox={`0 0 ${size} ${size}`}
					role="img"
					aria-label={`Context usage: ${percentLabel} of the window used`}
					style={{ display: 'block', transform: 'rotate(-90deg)' }}
				>
					{arcs.map((arc) => (
						<circle
							key={arc.id}
							cx={center}
							cy={center}
							r={radius}
							fill="none"
							stroke={arc.color}
							strokeWidth={strokeWidth}
							strokeLinecap="butt"
							strokeDasharray={`${arc.dash} ${circumference}`}
							strokeDashoffset={arc.dashOffset}
							onMouseEnter={
								arc.interactive ? () => setHoveredId(arc.id) : undefined
							}
							onMouseLeave={
								arc.interactive ? () => setHoveredId(null) : undefined
							}
							style={{
								cursor: arc.interactive ? 'pointer' : 'default',
								opacity:
									hoveredId === null || hoveredId === arc.id ? 1 : 0.4,
							}}
						/>
					))}
				</svg>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 2,
						pointerEvents: 'none',
					}}
				>
					<span
						style={{
							...TITLE_TEXT,
							color: theme.text.primary,
							fontVariantNumeric: 'tabular-nums',
						}}
					>
						{centerValue}
					</span>
					<span
						style={{
							...META_LABEL_TEXT,
							color: theme.text.tertiary,
							maxWidth: size - strokeWidth * 2 - 8,
							textAlign: 'center',
						}}
					>
						{centerCaption}
					</span>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Root component
// ============================================================================
export default function ContextUsageDetail() {
	const [data] = useCanvasState<ContextUsageCanvasData | null>('contextUsage', null);

	const chatName =
		data?.composerChatName?.trim() || 'Untitled Chat';
	const composerId = data?.composerId?.trim();
	const { tokens: themeTokens } = useHostTheme();

	const focusCategoryId = data?.focus?.categoryId;
	const focusNonce = data?.focus?.nonce;
	const isFocusTop =
		focusCategoryId === CONTEXT_USAGE_CANVAS_TOP_FOCUS_CATEGORY_ID;
	const [openCategoryIds, setOpenCategoryIds] = useState<Record<string, boolean>>({});
	const categoryRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
	// Expand every top-level category once on first load. Guarded by a ref so
	// live data refreshes don't re-open sections the user has since collapsed.
	const didInitOpenRef = useRef(false);
	useEffect(() => {
		if (didInitOpenRef.current) {
			return;
		}
		const initialCategories = data?.categories;
		if (initialCategories === undefined || initialCategories.length === 0) {
			return;
		}
		didInitOpenRef.current = true;
		setOpenCategoryIds(() => {
			const next: Record<string, boolean> = {};
			for (const category of initialCategories) {
				next[category.id] = true;
			}
			return next;
		});
	}, [data]);
	const focusScrolledNonceRef = useRef<number | undefined>(undefined);
	useEffect(() => {
		if (focusCategoryId === undefined || isFocusTop) {
			return;
		}
		setOpenCategoryIds((prev) => ({ ...prev, [focusCategoryId]: true }));
	}, [focusCategoryId, focusNonce, isFocusTop]);
	// Scroll only after the focused category has actually expanded. Running it in
	// the same effect that requests the open would scroll a still-collapsed
	// section, and its later growth could push the target back off-screen. The
	// nonce ref ensures we scroll once per focus request, not on every toggle.
	useEffect(() => {
		if (focusCategoryId === undefined || focusNonce === undefined) {
			return;
		}
		if (focusScrolledNonceRef.current === focusNonce) {
			return;
		}
		if (isFocusTop) {
			const scroller = (document.scrollingElement ??
				document.documentElement) as HTMLElement | null;
			scroller?.scrollTo({ top: 0, behavior: 'smooth' });
			focusScrolledNonceRef.current = focusNonce;
			return;
		}
		if (openCategoryIds[focusCategoryId] !== true) {
			return;
		}
		const node = categoryRowRefs.current[focusCategoryId];
		if (node !== null && node !== undefined) {
			node.scrollIntoView({ behavior: 'smooth', block: 'start' });
			focusScrolledNonceRef.current = focusNonce;
		}
	}, [focusCategoryId, focusNonce, isFocusTop, openCategoryIds]);

	// Reserve scrollbar space on the canvas document so the layout does not
	// shift sideways when content grows tall enough to overflow. Scoped to this
	// template's document rather than the shared canvas service.
	useEffect(() => {
		const scroller = (document.scrollingElement ??
			document.documentElement) as HTMLElement | null;
		if (scroller === null) {
			return;
		}
		const previous = scroller.style.scrollbarGutter;
		scroller.style.scrollbarGutter = 'stable';
		return () => {
			scroller.style.scrollbarGutter = previous;
		};
	}, []);

	if (!data || data.categories.length === 0) {
		return (
			<Stack gap={16}>
				<ContextUsageHeader chatName={chatName} composerId={composerId} />
				<Text tone="secondary">{COPY.emptyState}</Text>
			</Stack>
		);
	}

	const categories = data.categories;
	const itemsByCategory = groupItemsByCategory(data.items);
	const largestCategory = getLargestCategory(categories);

	// Expand all / Collapse all drives every top-level category section. Each
	// section is collapsible (it always reveals at least its description), so we
	// target all of them — including categories with no discrete items.
	const expandableCategoryIds = categories.map((category) => category.id);
	const allCategoriesExpanded =
		expandableCategoryIds.length > 0 &&
		expandableCategoryIds.every((id) => openCategoryIds[id]);
	const toggleAllCategories = () => {
		const next = !allCategoriesExpanded;
		setOpenCategoryIds(() => {
			const nextState: Record<string, boolean> = {};
			for (const id of expandableCategoryIds) {
				nextState[id] = next;
			}
			return nextState;
		});
	};
	const percentFull =
		data.contextWindowSize > 0
			? (data.totalTokensUsed / data.contextWindowSize) * 100
			: 0;

	const segments = categories.map((category) => ({
		id: category.id,
		label: category.label,
		value: category.tokens,
		...(category.color ? { color: toSwatchColor(category.color) } : {}),
	}));

	const percentLabel = `${Math.round(percentFull)}%`;

	return (
		<div style={{ maxWidth: 748, marginInline: 'auto', width: '100%' }}>
		<Stack gap={20}>
			<Stack gap={24}>
				<ContextUsageHeader chatName={chatName} composerId={composerId} />
				<div
					style={{
						display: 'flex',
						width: '100%',
						gap: 24,
						minWidth: 0,
					}}
				>
					{data.repository ? (
						<HeaderMetaChunk
							label={COPY.metaRepository}
							value={data.repository}
						/>
					) : null}
					<HeaderMetaChunk
						label={COPY.metaContextSize}
						value={data.contextWindowLabel}
					/>
					<HeaderMetaChunk
						label={COPY.metaTokensUsed}
						value={data.totalTokensLabel}
					/>
				</div>
				<Text tone="secondary">{COPY.intro}</Text>
			</Stack>
			<div style={{ paddingTop: 16, paddingBottom: 16 }}>
				<ContextUsagePie
					total={data.contextWindowSize}
					segments={segments}
					percentLabel={percentLabel}
				/>
			</div>
			{percentFull >= 80 && largestCategory !== undefined ? (
				<Callout tone="warning" title={COPY.contextFullTitle}>
					{largestCategory.label} is your largest bucket at{' '}
					{formatTokenCount(largestCategory.tokens)} tokens. Summarizing the conversation or
					starting a new chat usually frees the most room. Expand categories
					below to find the biggest individual items.
				</Callout>
			) : null}
			<div
				aria-hidden
				style={{
					height: 1,
					width: '100%',
					background: themeTokens.stroke.secondary,
				}}
			/>
			<Stack gap={10}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
						marginBottom: 8,
					}}
				>
					<span
						style={{
							...TITLE_TEXT,
							color: themeTokens.text.primary,
						}}
					>
						{COPY.explorerTitle}
					</span>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							flexShrink: 0,
						}}
					>
						{expandableCategoryIds.length > 0 ? (
							<Button variant="ghost" onClick={toggleAllCategories}>
								{allCategoriesExpanded ? COPY.collapseAll : COPY.expandAll}
							</Button>
						) : null}
						<AskAboutContextUsage />
					</div>
				</div>
				<Text tone="secondary" style={{ marginBottom: 8 }}>
					{COPY.explorerIntro}
				</Text>
				<Stack gap={6}>
					{categories.map((category, index) => {
						const categoryItems = itemsByCategory.get(category.id) ?? [];
						// Header count is the total number of leaf items in the
						// category (folders are synthetic groupings, so every item is
						// a leaf), e.g. the number of skills rather than skill folders.
						const leafCount = categoryItems.length;
						return (
							<div
								key={category.id}
								ref={(node) => {
									categoryRowRefs.current[category.id] = node;
								}}
							>
								<CategoryCollapsibleSection
									category={category}
									sectionCount={leafCount}
									showTokensUnit={index === 0}
									open={openCategoryIds[category.id] ?? false}
									onOpenChange={(next) =>
										setOpenCategoryIds((prev) => ({
											...prev,
											[category.id]: next,
										}))
									}
								>
									{leafCount > 0 ? (
									<CategoryItems
										items={categoryItems}
										categoryId={category.id}
										toolCallGroupLabels={data.toolCallGroupLabels}
										depth={0}
									/>
									) : null}
								</CategoryCollapsibleSection>
							</div>
						);
					})}
				</Stack>
			</Stack>
		</Stack>
		</div>
	);
}