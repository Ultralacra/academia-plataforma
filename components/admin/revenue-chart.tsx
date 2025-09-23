"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const revenueData = [
  { month: "Ene", revenue: 12500, students: 45 },
  { month: "Feb", revenue: 15200, students: 52 },
  { month: "Mar", revenue: 18900, students: 61 },
  { month: "Abr", revenue: 22100, students: 68 },
  { month: "May", revenue: 25800, students: 75 },
  { month: "Jun", revenue: 28400, students: 82 },
  { month: "Jul", revenue: 31200, students: 89 },
  { month: "Ago", revenue: 34600, students: 95 },
  { month: "Sep", revenue: 37800, students: 102 },
  { month: "Oct", revenue: 41200, students: 108 },
  { month: "Nov", revenue: 44500, students: 115 },
  { month: "Dic", revenue: 47800, students: 122 },
]

export function RevenueChart() {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Evolución de Ingresos</CardTitle>
        <CardDescription>Ingresos mensuales y crecimiento de estudiantes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === "revenue" ? `€${value.toLocaleString()}` : value,
                name === "revenue" ? "Ingresos" : "Estudiantes",
              ]}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
