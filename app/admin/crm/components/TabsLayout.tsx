"use client";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function CrmTabsLayout({
  value,
  onValueChange,
  pipeline,
  agenda,
  forms,
  metrics,
}: {
  value: string;
  onValueChange: (v: string) => void;
  pipeline: React.ReactNode;
  agenda: React.ReactNode;
  forms: React.ReactNode;
  metrics: React.ReactNode;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <TabsList className="bg-white/60 backdrop-blur border">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="formularios">Formularios</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
      </div>
      <div className="mt-4 flex-1 overflow-auto">
        <TabsContent value="pipeline" className="m-0 h-full">
          {pipeline}
        </TabsContent>
        <TabsContent value="agenda" className="m-0 h-full">
          {agenda}
        </TabsContent>
        <TabsContent value="formularios" className="m-0 h-full">
          {forms}
        </TabsContent>
        <TabsContent value="metricas" className="m-0 h-full">
          {metrics}
        </TabsContent>
      </div>
    </Tabs>
  );
}
