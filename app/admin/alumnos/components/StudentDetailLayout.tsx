"use client";

import React from "react";
import Header from "../[code]/_parts/Header";
import MetricsStrip from "../[code]/_parts/MetricsStrip";
import TicketsPanel from "../[code]/_parts/TicketsPanel";
import ActivityFeed from "../[code]/_parts/ActivityFeed";
import ChatPanel from "../[code]/_parts/ChatPanel";
import CoachesCard from "../[code]/_parts/CoachesCard";

// Mejor layout: columnas, nav accesible y tarjetas consistentes.
export default function StudentDetailLayout(props: any) {
  const [tab, setTab] = React.useState<
    "tickets" | "chat" | "activity" | "coaches" | "info"
  >("tickets");

  return (
    <div className="student-detail">
      <Header {...props} />

      <div className="mt-4 space-y-4">
        <MetricsStrip {...props} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main column: tickets + chat (span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <nav
                role="tablist"
                aria-label="Secciones de ficha del alumno"
                className="flex gap-2"
              >
                <TabButton
                  active={tab === "tickets"}
                  onClick={() => setTab("tickets")}
                >
                  Tickets
                </TabButton>
                <TabButton
                  active={tab === "chat"}
                  onClick={() => setTab("chat")}
                >
                  Chat
                </TabButton>
                <TabButton
                  active={tab === "activity"}
                  onClick={() => setTab("activity")}
                >
                  Actividad
                </TabButton>
                <TabButton
                  active={tab === "coaches"}
                  onClick={() => setTab("coaches")}
                >
                  Coaches
                </TabButton>
                <TabButton
                  active={tab === "info"}
                  onClick={() => setTab("info")}
                >
                  Info
                </TabButton>
              </nav>
            </div>

            <div>
              {tab === "tickets" && <TicketsPanel {...props} />}
              {tab === "chat" && <ChatPanel {...props} />}
              {tab === "activity" && <ActivityFeed {...props} />}
            </div>
          </div>

          {/* Side column: coaches + info card */}
          <aside className="space-y-4">
            <CoachesCard {...props} />

            {tab === "coaches" && (
              <div className="hidden lg:block">
                {/* cuando está activada la pestaña coaches, el componente se muestra arriba; aquí podemos dejar más detalles si hace falta */}
              </div>
            )}

            {tab === "info" && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold">Información</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Datos y configuración del alumno
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active ? "true" : "false"}
      onClick={onClick}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        active
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
          : "bg-white text-muted-foreground border border-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
