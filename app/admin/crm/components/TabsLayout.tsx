"use client";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* Standalone tab buttons - can be used outside Tabs context */
export function CrmTabsList({
  value,
  onValueChange,
  hasCampanas,
  hasAgenda,
}: {
  value: string;
  onValueChange: (v: string) => void;
  hasCampanas?: boolean;
  hasAgenda?: boolean;
}) {
  const tabClass = (tab: string) =>
    cn(
      "h-5 sm:h-6 px-1.5 sm:px-2.5 text-[10px] sm:text-xs rounded-full transition-colors",
      value === tab
        ? "bg-indigo-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100",
    );

  return (
    <div className="flex bg-gradient-to-r from-indigo-50 via-white to-sky-50 border border-slate-200/70 rounded-full p-0.5 shadow-sm h-6 sm:h-7 gap-0.5">
      <button
        type="button"
        onClick={() => onValueChange("pipeline")}
        className={tabClass("pipeline")}
      >
        Pipeline
      </button>
      {hasAgenda && (
        <button
          type="button"
          onClick={() => onValueChange("agenda")}
          className={tabClass("agenda")}
        >
          Agenda
        </button>
      )}
      <button
        type="button"
        onClick={() => onValueChange("metricas")}
        className={tabClass("metricas")}
      >
        Métricas
      </button>
      {hasCampanas && (
        <button
          type="button"
          onClick={() => onValueChange("campanas")}
          className={tabClass("campanas")}
        >
          Campañas
        </button>
      )}
    </div>
  );
}

export function CrmTabsLayout({
  value,
  onValueChange,
  pipeline,
  campanas,
  agenda,
  metrics,
  externalTabs,
}: {
  value: string;
  onValueChange: (v: string) => void;
  pipeline: React.ReactNode;
  campanas?: React.ReactNode;
  agenda?: React.ReactNode;
  metrics: React.ReactNode;
  externalTabs?: boolean;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="flex-1 flex flex-col min-h-0"
    >
      {!externalTabs && (
        <div className="flex items-center justify-between">
          <CrmTabsList
            value={value}
            onValueChange={onValueChange}
            hasCampanas={!!campanas}
            hasAgenda={!!agenda}
          />
        </div>
      )}
      <div
        className={
          externalTabs
            ? "flex-1 overflow-auto min-h-0"
            : "mt-4 flex-1 overflow-auto min-h-0"
        }
      >
        <TabsContent value="pipeline" className="m-0 h-full">
          {pipeline}
        </TabsContent>
        {agenda ? (
          <TabsContent value="agenda" className="m-0 h-full">
            {agenda}
          </TabsContent>
        ) : null}
        <TabsContent value="metricas" className="m-0 h-full">
          {metrics}
        </TabsContent>
        {campanas ? (
          <TabsContent value="campanas" className="m-0 h-full">
            {campanas}
          </TabsContent>
        ) : null}
      </div>
    </Tabs>
  );
}
