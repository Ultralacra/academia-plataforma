"use client";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function CrmTabsLayout({
  value,
  onValueChange,
  pipeline,
  agenda,
  metrics,
}: {
  value: string;
  onValueChange: (v: string) => void;
  pipeline: React.ReactNode;
  agenda?: React.ReactNode;
  metrics: React.ReactNode;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      /* min-h-0 asegura que el contenedor pueda encoger y habilitar scroll del hijo */
      className="flex-1 flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between">
        <TabsList className="bg-white/70 backdrop-blur border rounded-lg">
          <TabsTrigger
            value="pipeline"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-indigo-600"
          >
            Pipeline
          </TabsTrigger>
          {agenda ? (
            <TabsTrigger
              value="agenda"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-indigo-600"
            >
              Agenda
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="metricas"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-indigo-600"
          >
            Métricas
          </TabsTrigger>
        </TabsList>
      </div>
      {/* overflow-auto aquí sí, para que cada tab pueda scrollear si crece */}
      <div className="mt-4 flex-1 overflow-auto min-h-0">
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
      </div>
    </Tabs>
  );
}
