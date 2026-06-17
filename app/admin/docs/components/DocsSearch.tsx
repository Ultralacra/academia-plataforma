"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { sections, type DocSection } from "../data/sections"

interface DocsSearchProps {
  onSelect: (sectionId: string) => void
  activeTab: "tecnico" | "manual"
}

export function DocsSearch({ onSelect, activeTab }: DocsSearchProps) {
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return sections
      .filter((s) => s.tab === activeTab)
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.subsections.some((sub) => sub.title.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [query, activeTab])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar en la documentación..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-8"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {results.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md">
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s.id)
                setQuery("")
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span className="text-muted-foreground">{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
