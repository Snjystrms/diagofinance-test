"use client"

import * as React from "react"

type ThemeProviderProps = React.PropsWithChildren<Record<string, unknown>>

const isProductionBuild = process.env.NODE_ENV === "production"
const devThemeToolsOverride = process.env.NEXT_PUBLIC_ENABLE_DEV_THEME_TOOLS === "true"

export const showDevThemeTools = !isProductionBuild || devThemeToolsOverride

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
