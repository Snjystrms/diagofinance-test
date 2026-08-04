'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface ViewContentDialogProps {
  content: string | null | undefined
  title?: string
  description?: string
  triggerLabel?: string
  triggerIcon?: React.ReactNode
  emptyLabel?: string
  className?: string
  contentClassName?: string
}

export function ViewContentDialog({
  content,
  title = 'Details',
  description = 'View full content',
  triggerLabel = 'View',
  triggerIcon,
  emptyLabel = '—',
  className,
  contentClassName,
}: ViewContentDialogProps) {
  if (!content) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>
  }

  const defaultIcon = triggerIcon || (
    <FileText className="h-4 w-4 mr-2" />
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-8 ${className || ''}`}>
          {defaultIcon}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className={`p-4 bg-muted rounded-lg ${contentClassName || ''}`}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}