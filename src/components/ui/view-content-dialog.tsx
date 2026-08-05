'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ViewContentDialogProps {
  content: string | null | undefined
  title?: string
  description?: string
  emptyLabel?: string
  maxLines?: number
  className?: string

  contentClassName?: string
  triggerClassName?: string
  triggerLabel?: string
}

export function ViewContentDialog({
  content,
  title = 'Details',
  description = 'View full content',
  emptyLabel = '—',
  maxLines = 1,
  className,
  contentClassName,
  triggerClassName,
  triggerLabel = 'View more',
}: ViewContentDialogProps) {
  const contentRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    const update = () => {
      setIsTruncated(
        el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
      )
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [content, maxLines])

  if (!content) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0 max-w-[220px]">
      <span
        ref={contentRef}
        className={cn(
          'text-sm text-foreground min-w-0 flex-1',
          maxLines === 1
            ? 'truncate'
            : 'break-words',
          className,
        )}
        style={
          maxLines === 1
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {content}
      </span>
      {isTruncated && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                'shrink-0 text-xs font-medium text-primary hover:underline whitespace-nowrap',
                triggerClassName,
              )}
            >
              {triggerLabel}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className={cn('p-4 bg-muted rounded-lg', contentClassName)}>
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}