"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DocsSidebar, DocsTabSwitcher } from "./components/DocsSidebar"
import { DocsSearch } from "./components/DocsSearch"
import { DocsContent } from "./components/DocsContent"
import { technicalSections, manualSections, type SectionTab } from "./data/sections"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>("tecnico")
  const [activeSection, setActiveSection] = useState<string>(() => {
    return activeTab === "tecnico" ? technicalSections[0]?.id : manualSections[0]?.id
  })

  const handleTabChange = (tab: SectionTab) => {
    setActiveTab(tab)
    const firstSection = tab === "tecnico" ? technicalSections[0] : manualSections[0]
    if (firstSection) setActiveSection(firstSection.id)
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "equipo"]}>
      <DashboardLayout>
        <div className="flex h-[calc(100vh-4rem)] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div>
              <h1 className="text-xl font-bold">Documentación</h1>
              <p className="text-sm text-muted-foreground">
                Guía técnica y manual de usuario de la plataforma
              </p>
            </div>
            <DocsTabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 shrink-0 border-r p-4">
              <div className="mb-4">
                <DocsSearch onSelect={setActiveSection} activeTab={activeTab} />
              </div>
              <ScrollArea className="h-[calc(100%-3rem)]">
                <DocsSidebar
                  activeTab={activeTab}
                  activeSection={activeSection}
                  onSelectSection={setActiveSection}
                />
              </ScrollArea>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6">
              <DocsContent activeSection={activeSection} activeTab={activeTab} />
            </main>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
