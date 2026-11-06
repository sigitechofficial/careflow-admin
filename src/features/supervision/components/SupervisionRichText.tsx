import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color as TextColor, FontSize } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { cn } from '@/shared/lib/utils'
import { SummernoteCustomEditor } from '@/shared/ui/summernote-custom-editor'
import { isEmptyRichText } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'

/**
 * Supervision notes use the same Summernote-style editor as the IA (formatting toolbar + Dictate mic).
 * Empty editor content ("<p></p>") is saved as no note.
 */
export function SupervisionRichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  return (
    <SummernoteCustomEditor
      value={value}
      onChange={html => onChange(isEmptyRichText(html) ? '' : html)}
      placeholder={placeholder ?? 'Type or dictate…'}
      minHeight={minHeight}
      dictation
    />
  )
}

/**
 * Signed record view: renders saved notes with their formatting and no toolbar. Content goes
 * through the editor schema, so only known formatting is shown (no raw HTML is injected).
 */
export function SupervisionRichTextView({ html, className }: { html: string | null | undefined; className?: string }) {
  const empty = isEmptyRichText(html ?? '')
  const editor = useEditor(
    {
      editable: false,
      content: empty ? '' : (html ?? ''),
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Underline,
        TextStyle,
        TextColor,
        FontSize,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
      ],
    },
    [html],
  )
  if (empty) return <p className={cn('rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground', className)}>—</p>
  return (
    <div className={cn('supervision-rich-text rounded-md bg-muted/30 px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5', className)}>
      <EditorContent editor={editor} />
    </div>
  )
}
