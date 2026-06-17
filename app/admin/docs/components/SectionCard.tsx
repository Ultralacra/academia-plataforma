"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ContentBlock } from "../data/technical"
import type { ManualContentBlock } from "../data/manual"

type Block = ContentBlock | ManualContentBlock

interface SectionCardProps {
  title: string
  icon?: string
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  children: React.ReactNode
}

export function SectionCard({ title, icon, badge, badgeVariant = "secondary", children }: SectionCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function ContentBlockRenderer({ block }: { block: Block }) {
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
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
        <ol className="list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
          {block.steps?.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )

    default:
      return null
  }
}
