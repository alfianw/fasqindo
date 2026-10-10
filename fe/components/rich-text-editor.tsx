'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { escapeHtml, toHtml } from '@/lib/html'

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeThrough: boolean
  insertUnorderedList: boolean
  insertOrderedList: boolean
  h2: boolean
  h3: boolean
}

const EMPTY_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  h2: false,
  h3: false,
}

function readBlockState(): { h2: boolean; h3: boolean } {
  let block = ''
  try {
    block = (document.queryCommandValue('formatBlock') ?? '').toLowerCase()
  } catch {
    block = ''
  }
  return { h2: block === 'h2', h3: block === 'h3' }
}

export function RichTextEditor({ id, value, onChange, placeholder, minHeight = 160 }: {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastHtml = useRef('')
  const syncRef = useRef<() => void>(() => {})
  const [focused, setFocused] = useState(false)
  const [state, setState] = useState<FormatState>(EMPTY_STATE)

  const selectionInside = useCallback(() => {
    const el = ref.current
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return false
    const range = sel.getRangeAt(0)
    return (
      el.contains(range.commonAncestorContainer) &&
      el.contains(sel.anchorNode) &&
      el.contains(sel.focusNode)
    )
  }, [])

  const sync = useCallback(() => {
    if (!selectionInside()) {
      setState(EMPTY_STATE)
      return
    }
    const next: FormatState = { ...EMPTY_STATE }
    for (const command of Object.keys(EMPTY_STATE) as (keyof FormatState)[]) {
      if (command === 'h2' || command === 'h3') continue
      try {
        next[command] = document.queryCommandState(command)
      } catch {
        next[command] = false
      }
    }
    Object.assign(next, readBlockState())
    setState(next)
  }, [selectionInside])
  syncRef.current = sync

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Enter must split into real <p> blocks, otherwise formatBlock (H2/H3)
    // mangles the whole content into a single heading.
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      // unsupported in some engines; ignore
    }
    // Only push the incoming value into the DOM when it changed from the
    // outside. Echoes from our own onInput must never rewrite innerHTML,
    // otherwise the caret jumps and typing gets garbled.
    if (value === lastHtml.current) return
    const next = toHtml(value)
    if (el.innerHTML !== next) el.innerHTML = next
    lastHtml.current = next
  }, [value])

  useEffect(() => {
    sync()
    document.addEventListener('selectionchange', sync)
    return () => document.removeEventListener('selectionchange', sync)
  }, [sync])

  const emit = () => {
    const html = ref.current?.innerHTML ?? ''
    lastHtml.current = html
    onChange(html)
  }

  const exec = (command: string, arg?: string) => {
    const el = ref.current
    if (!el) return
    if (!selectionInside()) {
      // No live selection in this editor (e.g. toolbar was activated while
      // focus was elsewhere): move the caret here so the command applies here.
      el.focus()
      try {
        const sel = window.getSelection()
        if (!sel) return
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)
      } catch {
        // ignore
      }
    } else {
      el.focus()
    }
    try {
      document.execCommand(command, false, arg)
    } catch {
      // some older engines throw on unsupported commands; ignore
    }
    emit()
    syncRef.current()
  }

  const toggleHeading = (level: 2 | 3) => {
    const key = `h${level}` as 'h2' | 'h3'
    // Read the block state fresh at click time: state may be stale if the
    // selection just moved or belongs to another editor.
    exec('formatBlock', readBlockState()[key] ? '<p>' : `<h${level}>`)
  }

  const insertLink = () => {
    const el = ref.current
    if (!el) return
    el.focus()
    const selection = window.getSelection()
    const text = selection && selection.rangeCount ? selection.toString().trim() : ''
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    if (text) {
      exec('createLink', url)
    } else {
      const safeUrl = escapeHtml(url)
      exec('insertHTML', `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`)
    }
  }

  const buttons = [
    { title: 'Bold', onCommand: () => exec('bold'), icon: Bold, active: state.bold },
    { title: 'Italic', onCommand: () => exec('italic'), icon: Italic, active: state.italic },
    { title: 'Underline', onCommand: () => exec('underline'), icon: Underline, active: state.underline },
    { title: 'Strikethrough', onCommand: () => exec('strikeThrough'), icon: Strikethrough, active: state.strikeThrough },
  ]

  return (
    <div className="admin-richtext-editor">
      <div className="admin-richtext-toolbar" role="toolbar" aria-label="Formatting options">
        {buttons.map(({ title, onCommand, icon: Icon, active }) => (
          <button key={title} type="button" title={title} aria-label={title} aria-pressed={active} className={active ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={onCommand}><Icon size={15} /></button>
        ))}
        <span className="admin-richtext-sep" aria-hidden="true" />
        <button type="button" title="Heading 2" aria-label="Heading 2" aria-pressed={state.h2} className={state.h2 ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleHeading(2)}><Heading2 size={15} /></button>
        <button type="button" title="Heading 3" aria-label="Heading 3" aria-pressed={state.h3} className={state.h3 ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleHeading(3)}><Heading3 size={15} /></button>
        <span className="admin-richtext-sep" aria-hidden="true" />
        <button type="button" title="Bulleted list" aria-label="Bulleted list" aria-pressed={state.insertUnorderedList} className={state.insertUnorderedList ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => exec('insertUnorderedList')}><List size={15} /></button>
        <button type="button" title="Numbered list" aria-label="Numbered list" aria-pressed={state.insertOrderedList} className={state.insertOrderedList ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => exec('insertOrderedList')}><ListOrdered size={15} /></button>
        <span className="admin-richtext-sep" aria-hidden="true" />
        <button type="button" title="Insert link" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={insertLink}><Link size={15} /></button>
        <button type="button" title="Remove formatting" aria-label="Remove formatting" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('removeFormat')}><Eraser size={15} /></button>
      </div>
      <div
        ref={ref}
        id={id}
        className={`admin-richtext-area ${focused ? 'is-focused' : ''}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={emit}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); emit() }}
      />
    </div>
  )
}