import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { Mark, mergeAttributes } from "@tiptap/core"
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Minus,
  Undo2, Redo2, Link2, IndentIncrease, IndentDecrease,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

const PolicyLink = Mark.create({
  name: "link",
  inclusive: false,
  addOptions() {
    return { openOnClick: false }
  },
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

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string, json?: Record<string, unknown>) => void
  onChangeJson?: (json: Record<string, unknown>) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  className?: string
}

function ToolbarBtn({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded transition-colors text-muted-foreground",
        active ? "bg-accent text-foreground" : "hover:bg-accent hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  onChangeJson,
  placeholder = "Start typing...",
  disabled,
  minHeight = 160,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      PolicyLink,
    ],
    content: value ?? "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const json = editor.getJSON() as Record<string, unknown>
      onChange?.(html, json)
      onChangeJson?.(json)
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

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined
    const next = window.prompt("Link URL", previous ?? "https://")
    if (next == null) return
    const trimmed = next.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetMark("link").run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setMark("link", { href: trimmed }).run()
  }

  const groups = [
    [
      { icon: <Undo2 className="h-3.5 w-3.5" />, action: () => editor.chain().focus().undo().run(), active: false, disabled: !editor.can().undo(), label: "Undo" },
      { icon: <Redo2 className="h-3.5 w-3.5" />, action: () => editor.chain().focus().redo().run(), active: false, disabled: !editor.can().redo(), label: "Redo" },
    ],
    [
      { icon: <Bold className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), disabled: false, label: "Bold" },
      { icon: <Italic className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), disabled: false, label: "Italic" },
      { icon: <UnderlineIcon className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), disabled: false, label: "Underline" },
      { icon: <Strikethrough className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), disabled: false, label: "Strikethrough" },
      { icon: <Link2 className="h-3.5 w-3.5" />, action: setLink, active: editor.isActive("link"), disabled: false, label: "Link" },
    ],
    [
      { icon: <AlignLeft className="h-3.5 w-3.5" />, action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }), disabled: false, label: "Align left" },
      { icon: <AlignCenter className="h-3.5 w-3.5" />, action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }), disabled: false, label: "Align center" },
      { icon: <AlignRight className="h-3.5 w-3.5" />, action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }), disabled: false, label: "Align right" },
    ],
    [
      { icon: <List className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), disabled: false, label: "Bullet list" },
      { icon: <ListOrdered className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), disabled: false, label: "Numbered list" },
      { icon: <IndentDecrease className="h-3.5 w-3.5" />, action: () => editor.chain().focus().liftListItem("listItem").run(), active: false, disabled: !editor.can().liftListItem("listItem"), label: "Decrease indent" },
      { icon: <IndentIncrease className="h-3.5 w-3.5" />, action: () => editor.chain().focus().sinkListItem("listItem").run(), active: false, disabled: !editor.can().sinkListItem("listItem"), label: "Increase indent" },
      { icon: <Quote className="h-3.5 w-3.5" />, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), disabled: false, label: "Quote" },
      { icon: <Minus className="h-3.5 w-3.5" />, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, disabled: false, label: "Horizontal rule" },
    ],
  ]

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", disabled && "opacity-60", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="mx-1 h-5 w-px bg-border" />}
            {group.map((item, i) => (
              <ToolbarBtn key={i} active={item.active} disabled={item.disabled} onClick={item.action} label={item.label}>
                {item.icon}
              </ToolbarBtn>
            ))}
          </React.Fragment>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <select
          aria-label="Heading"
          value={editor.isActive("heading", { level: 1 }) ? "h1" : editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p"}
          onChange={e => {
            if (e.target.value === "p") editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: Number(e.target.value.replace("h", "")) as 1|2|3 }).run()
          }}
          disabled={disabled}
          className="h-7 rounded bg-transparent px-1 text-xs text-muted-foreground outline-none hover:bg-accent cursor-pointer"
        >
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus-within:outline-none",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[inherit]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/30 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground",
          "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline",
        )}
      />
    </div>
  )
}
