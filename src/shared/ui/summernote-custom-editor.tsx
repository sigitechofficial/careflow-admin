import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle, Color as TextColor, FontSize } from "@tiptap/extension-text-style"
import Highlight from "@tiptap/extension-highlight"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import Image from "@tiptap/extension-image"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import { Mark, mergeAttributes } from "@tiptap/core"
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus,
  Undo2, Redo2, Link2, Link2Off,
  IndentIncrease, IndentDecrease,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  ImagePlus, Table as TableIcon,
  Code, Code2, Eraser, Palette, Highlighter,
  Columns2, RowsIcon, Trash2, Maximize, Minimize,
  ChevronDown, Type, Pilcrow, RemoveFormatting,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { DictationButton, dictationChunk } from "@/shared/ui/dictation"

// ── Link mark ────────────────────────────────────────────
const LinkMark = Mark.create({
  name: "link",
  inclusive: false,
  addAttributes() {
    return {
      href: { default: null },
      target: { default: "_blank" },
      rel: { default: "noopener noreferrer nofollow" },
    }
  },
  parseHTML() {
    return [{ tag: "a[href]" }]
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["a", mergeAttributes(HTMLAttributes), 0]
  },
})

// ── Color palette ────────────────────────────────────────
const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff",
  "#9900ff", "#ff00ff", "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3",
  "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
]

const HIGHLIGHT_COLORS = [
  "#ffff00", "#00ff00", "#00ffff", "#ff69b4", "#ff9900", "#ff0000",
  "#9900ff", "#4a86e8", "#cccccc", "transparent",
]

// ── Toolbar button ───────────────────────────────────────
function Btn({
  active, disabled, onClick, children, label, className: cls,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void
  children: React.ReactNode; label: string; className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 min-w-[28px] items-center justify-center rounded px-0.5 transition-colors text-muted-foreground",
        active ? "bg-accent text-foreground" : "hover:bg-accent hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
        cls,
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="mx-0.5 h-5 w-px bg-border shrink-0" />
}

// ── Color picker popover ─────────────────────────────────
function ColorPicker({
  colors, value, onChange, icon, label,
}: {
  colors: string[]; value?: string; onChange: (c: string) => void
  icon: React.ReactNode; label: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Btn label={label} onClick={() => setOpen(!open)} active={open}>
        <span className="flex flex-col items-center gap-0">
          {icon}
          <span
            className="mt-px block h-[3px] w-3.5 rounded-sm"
            style={{ backgroundColor: value || "#000" }}
          />
        </span>
      </Btn>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-2.5 shadow-lg" style={{ width: colors.length > 10 ? 232 : 'auto' }}>
          <div className="flex flex-wrap gap-1" style={{ maxWidth: colors.length > 10 ? 220 : undefined }}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => { onChange(c); setOpen(false) }}
                className={cn(
                  "rounded border border-border/50 transition-transform hover:scale-125 shrink-0",
                  c === "transparent" && "bg-[repeating-conic-gradient(#ccc_0%_25%,transparent_0%_50%)] bg-[length:8px_8px]",
                )}
                style={{
                  width: 18, height: 18,
                  ...(c !== "transparent" ? { backgroundColor: c } : {}),
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Table insert popover ─────────────────────────────────
function TableInsert({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = React.useState(false)
  const [hover, setHover] = React.useState({ r: 0, c: 0 })
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Btn label="Insert table" onClick={() => setOpen(!open)} active={open}>
        <TableIcon className="h-3.5 w-3.5" />
      </Btn>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
          <div className="mb-1 text-xs text-muted-foreground text-center">
            {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Select size"}
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {Array.from({ length: 48 }, (_, i) => {
              const r = Math.floor(i / 8) + 1
              const c = (i % 8) + 1
              const active = r <= hover.r && c <= hover.c
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHover({ r, c })}
                  onClick={() => { onInsert(r, c); setOpen(false) }}
                  className={cn(
                    "h-4 w-4 rounded-sm border transition-colors",
                    active ? "border-sky-400 bg-sky-100 dark:bg-sky-900" : "border-border bg-background",
                  )}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main editor props ────────────────────────────────────
interface SummernoteCustomEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  className?: string
  /** Show a speech-to-text mic in the toolbar (hidden where the browser has no Web Speech API). */
  dictation?: boolean
}

export function SummernoteCustomEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  disabled,
  minHeight = 200,
  className,
  dictation,
}: SummernoteCustomEditorProps) {
  const [fullscreen, setFullscreen] = React.useState(false)
  const [showSource, setShowSource] = React.useState(false)
  const [sourceHtml, setSourceHtml] = React.useState("")

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextStyle,
      TextColor,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      LinkMark,
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value ?? "",
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML())
    },
  })

  React.useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  React.useEffect(() => {
    if (!editor || value == null) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  const toggleSource = () => {
    if (showSource) {
      editor.commands.setContent(sourceHtml, { emitUpdate: true })
      setShowSource(false)
    } else {
      setSourceHtml(editor.getHTML())
      setShowSource(true)
    }
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined
    const next = window.prompt("Enter URL", previous ?? "https://")
    if (next == null) return
    const trimmed = next.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetMark("link").run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setMark("link", { href: trimmed }).run()
  }

  const insertImage = () => {
    const url = window.prompt("Image URL")
    if (url?.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run()
    }
  }

  const clearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run()
  }

  // Insert after the selection (selected text is kept), spacing it from its neighbours.
  const insertDictation = (text: string) => {
    const pos = editor.state.selection.to
    const { doc } = editor.state
    const chunk = dictationChunk(
      doc.textBetween(Math.max(0, pos - 1), pos, "\n", " "),
      text,
      doc.textBetween(pos, Math.min(doc.content.size, pos + 1), "\n", " "),
    )
    if (chunk) editor.chain().insertContentAt(pos, { type: "text", text: chunk }).run()
  }

  const currentColor = (editor.getAttributes("textStyle").color as string) || "#000000"
  const currentHighlight = (editor.getAttributes("highlight").color as string) || "transparent"

  const wrapCls = cn(
    "flex flex-col rounded-lg border border-border overflow-hidden bg-card",
    fullscreen && "fixed inset-0 z-50 rounded-none border-none",
    disabled && "opacity-60",
    className,
  )

  return (
    <div className={wrapCls}>
      {/* ── Row 1: Style, Font, Size ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
        {/* Heading / paragraph selector */}
        <select
          aria-label="Block style"
          value={
            editor.isActive("heading", { level: 1 }) ? "1"
            : editor.isActive("heading", { level: 2 }) ? "2"
            : editor.isActive("heading", { level: 3 }) ? "3"
            : editor.isActive("heading", { level: 4 }) ? "4"
            : editor.isActive("heading", { level: 5 }) ? "5"
            : editor.isActive("heading", { level: 6 }) ? "6"
            : editor.isActive("codeBlock") ? "code"
            : "0"
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === "0") editor.chain().focus().setParagraph().run()
            else if (v === "code") editor.chain().focus().toggleCodeBlock().run()
            else editor.chain().focus().setHeading({ level: Number(v) as 1|2|3|4|5|6 }).run()
          }}
          disabled={disabled}
          className="h-7 rounded bg-transparent px-1.5 text-xs text-foreground outline-none hover:bg-accent cursor-pointer border border-transparent hover:border-border"
        >
          <option value="0">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
          <option value="code">Code block</option>
        </select>

        <Sep />

        {/* Font size — uses inline style via TextStyle */}
        <select
          aria-label="Font size"
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === "default") {
              editor.chain().focus().unsetFontSize().run()
            } else {
              editor.chain().focus().setFontSize(v).run()
            }
          }}
          disabled={disabled}
          className="h-7 w-16 rounded bg-transparent px-1 text-xs text-foreground outline-none hover:bg-accent cursor-pointer border border-transparent hover:border-border"
        >
          <option value="">Size</option>
          <option value="default">Default</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="28px">28</option>
          <option value="32px">32</option>
          <option value="36px">36</option>
        </select>
      </div>

      {/* ── Row 2: Formatting, Colors, Lists, Insert ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
        {/* Undo / Redo */}
        <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Text format */}
        <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Colors */}
        <ColorPicker
          label="Text color"
          icon={<Type className="h-3 w-3" />}
          colors={COLORS}
          value={currentColor}
          onChange={(c) => editor.chain().focus().setColor(c).run()}
        />
        <ColorPicker
          label="Highlight"
          icon={<Highlighter className="h-3 w-3" />}
          colors={HIGHLIGHT_COLORS}
          value={currentHighlight}
          onChange={(c) => {
            if (c === "transparent") editor.chain().focus().unsetHighlight().run()
            else editor.chain().focus().toggleHighlight({ color: c }).run()
          }}
        />

        <Sep />

        {/* Alignment */}
        <Btn label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Lists */}
        <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Decrease indent" disabled={!editor.can().liftListItem("listItem")} onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
          <IndentDecrease className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Increase indent" disabled={!editor.can().sinkListItem("listItem")} onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
          <IndentIncrease className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Block elements */}
        <Btn label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Links & media */}
        <Btn label="Insert link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().extendMarkRange("link").unsetMark("link").run()}>
          <Link2Off className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Insert image" onClick={insertImage}>
          <ImagePlus className="h-3.5 w-3.5" />
        </Btn>

        <Sep />

        {/* Table */}
        <TableInsert onInsert={(rows, cols) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
        }} />
        {editor.isActive("table") && (
          <>
            <Btn label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns2 className="h-3.5 w-3.5" />
            </Btn>
            <Btn label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <RowsIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="h-3.5 w-3.5" />
            </Btn>
          </>
        )}

        <Sep />

        {/* Utilities */}
        <Btn label="Clear formatting" onClick={clearFormatting}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Source code" active={showSource} onClick={toggleSource}>
          <Code2 className="h-3.5 w-3.5" />
        </Btn>
        {dictation && (
          <DictationButton
            disabled={disabled || showSource}
            onStart={() => {
              if (!editor.isFocused) editor.commands.focus("end")
            }}
            onText={insertDictation}
          />
        )}
        <Btn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} active={fullscreen} onClick={() => setFullscreen(!fullscreen)}>
          {fullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </Btn>
      </div>

      {/* ── Editor content ── */}
      {showSource ? (
        <textarea
          className="flex-1 resize-none border-none bg-background p-4 font-mono text-xs text-foreground outline-none"
          style={{ minHeight }}
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <>
          <EditorContent
            editor={editor}
            style={{ minHeight }}
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto px-4 py-3 focus-within:outline-none",
              "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit]",
              "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
              "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
              "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
              "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
              "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
              "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/30 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground",
              "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline",
              "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2",
              "[&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-3",
              "[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:text-xs [&_.ProseMirror_th]:font-semibold",
              "[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_td]:text-sm",
              "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-xs [&_.ProseMirror_code]:font-mono",
              "[&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-zinc-900 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-zinc-100 [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:overflow-x-auto",
            )}
          />
        </>
      )}

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground">
        <span>{editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters</span>
        <span>{editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  )
}
