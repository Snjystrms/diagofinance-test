"use client"

import * as React from "react"

type ThemeProviderProps = React.PropsWithChildren<Record<string, unknown>>

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
