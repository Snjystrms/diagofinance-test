"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="toggle" style={{ background: "#333" }}>
        <div className="btn" style={{ marginLeft: "2px", background: "#fff" }}>
          <Sun className="h-4 w-4 text-gray-600" />
        </div>
      </button>
    )
  }

  const isDark = theme === "dark"
  
  const onClickHandler = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <button
      className="toggle"
      onClick={onClickHandler}
      style={{ 
        background: isDark ? "rgba(255,255,255,1)" : "#333",
        border: 0,
            width: "60px",
        height: "30px",
        borderRadius: "20px",
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)"
      }}
    >
      <div
        className="btn"
        style={{
          marginLeft: isDark ? "30px" : "2px",
          background: isDark ? "#333" : "#fff",
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          transition: "0.4s ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-white" />
        ) : (
          <Sun className="h-4 w-4 text-gray-600" />
        )}
      </div>
    </button>
  )
} 