"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { categories, sections, type SectionTab } from "../data/sections"
import {
  Building2,
  Shield,
  Database,
  Layers,
  Video,
  Bot,
  MessageSquare,
  Mail,
  HardDrive,
  FileText,
  Lock,
  Settings,
  LayoutDashboard,
  GraduationCap,
  Users,
  Ticket,
  Target,
  CreditCard,
  HeadphonesIcon,
  BarChart3,
  FileStack,
  Bell,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Code2,
  Smartphone,
  TestTube,
  FlaskConical,
} from "lucide-react"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Shield,
  Database,
  Layers,
  Video,
  Bot,
  MessageSquare,
  Mail,
  HardDrive,
  FileText,
  Lock,
  Settings,
  LayoutDashboard,
  GraduationCap,
  Users,
  Ticket,
  Target,
  CreditCard,
  HeadphonesIcon,
  BarChart3,
  FileStack,
  Bell,
  FolderOpen,
  Smartphone,
  TestTube,
  FlaskConical,
}

interface DocsSidebarProps {
  activeTab: SectionTab
  activeSection: string
  onSelectSection: (id: string) => void
}

export function DocsSidebar({ activeTab, activeSection, onSelectSection }: DocsSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  const cats = categories[activeTab] || []
  const tabSections = sections.filter((s) => s.tab === activeTab)

  return (
    <nav className="space-y-1">
      {cats.map((cat) => {
        const Icon = iconMap[cat.icon] || Settings
        const isExpanded = expandedCategories.has(cat.id)
        const catSections = tabSections.filter((s) => s.category === cat.id)
        const hasActive = catSections.some((s) => s.id === activeSection)

        return (
          <div key={cat.id}>
            <button
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                hasActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{cat.label}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
                {catSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => onSelectSection(sec.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      activeSection === sec.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {sec.subsections.length > 0 && (
                      <span className="text-xs text-muted-foreground">{sec.subsections.length}</span>
                    )}
                    {sec.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function DocsTabSwitcher({
  activeTab,
  onTabChange,
}: {
  activeTab: SectionTab
  onTabChange: (tab: SectionTab) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg border p-1">
      <button
        onClick={() => onTabChange("tecnico")}
        className={cn(
          "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          activeTab === "tecnico"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Code2 className="h-4 w-4" />
        Técnico
      </button>
      <button
        onClick={() => onTabChange("manual")}
        className={cn(
          "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          activeTab === "manual"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <BookOpen className="h-4 w-4" />
        Manual de Usuario
      </button>
    </div>
  )
}
