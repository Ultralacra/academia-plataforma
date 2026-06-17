"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { sections, type DocSection, type SectionTab } from "../data/sections"
import { technicalContent, type ContentBlock } from "../data/technical"
import { manualContent, type ManualContentBlock } from "../data/manual"

interface DocsContentProps {
  activeSection: string
  activeTab: SectionTab
}

export function DocsContent({ activeSection, activeTab }: DocsContentProps) {
  const section = sections.find((s) => s.id === activeSection)

  const content = useMemo(() => {
    if (activeTab === "tecnico") {
      return technicalContent.find((c) => c.id === activeSection)
    }
    return manualContent.find((c) => c.id === activeSection)
  }, [activeSection, activeTab])

  if (!section) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Selecciona una sección del menú lateral para ver su contenido</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{section.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeTab === "tecnico" ? "Documentación Técnica" : "Manual de Usuario"} — {section.subsections.length} secciones
        </p>
      </div>
      <Separator />
      {content?.subsections.map((sub) => (
        <div key={sub.id} id={sub.id} className="scroll-mt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {sub.id}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(sub.blocks as (ContentBlock | ManualContentBlock)[]).map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
      {!content && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Contenido en desarrollo...
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BlockRenderer({ block }: { block: ContentBlock | ManualContentBlock }) {
  switch (block.type) {
    case "text":
      return <p className="text-sm leading-relaxed text-muted-foreground">{block.content}</p>

    case "code":
      return (
        <div className="relative">
          {block.language && (
            <Badge variant="outline" className="absolute top-2 right-2 text-xs">
              {block.language}
            </Badge>
          )}
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            <code>{block.content}</code>
          </pre>
        </div>
      )

    case "list":
      return (
        <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {block.headers?.map((h, i) => (
                  <th key={i} className="p-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="p-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case "note":
      return (
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <strong>Nota:</strong> {block.content}
        </div>
      )

    case "warning":
      return (
        <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <strong>Advertencia:</strong> {block.content}
        </div>
      )

    case "architecture":
    case "flow":
      return (
        <div className="overflow-x-auto">
          <pre className="rounded-lg bg-muted p-4 text-xs leading-relaxed">{block.content}</pre>
        </div>
      )

    case "step":
      return (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-2 text-sm font-medium">Pasos:</h4>
          <ol className="list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
            {block.steps?.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )

    default:
      return null
  }
}

function BookOpen(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}
