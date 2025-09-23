"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, User, CreditCard, AlertTriangle } from "lucide-react"

const recentActivities = [
  {
    id: "1",
    type: "enrollment",
    message: "Ana García se inscribió en Marketing Digital Avanzado",
    time: "Hace 2 horas",
    icon: User,
    variant: "default" as const,
  },
  {
    id: "2",
    type: "payment",
    message: "Pago de €250 procesado para Carlos López",
    time: "Hace 4 horas",
    icon: CreditCard,
    variant: "default" as const,
  },
  {
    id: "3",
    type: "ticket",
    message: "Nuevo ticket de soporte: Problema con acceso al módulo",
    time: "Hace 6 horas",
    icon: AlertTriangle,
    variant: "destructive" as const,
  },
  {
    id: "4",
    type: "payment_failed",
    message: "Fallo en el pago de María Rodríguez - Cuenta suspendida",
    time: "Hace 1 día",
    icon: AlertTriangle,
    variant: "destructive" as const,
  },
  {
    id: "5",
    type: "completion",
    message: "Pedro Sánchez completó el módulo 3 de Desarrollo Web",
    time: "Hace 1 día",
    icon: User,
    variant: "default" as const,
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimas acciones en la plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => {
            const IconComponent = activity.icon
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <IconComponent className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.message}</p>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                    <Badge variant={activity.variant} className="text-xs">
                      {activity.type === "enrollment" && "Inscripción"}
                      {activity.type === "payment" && "Pago"}
                      {activity.type === "ticket" && "Soporte"}
                      {activity.type === "payment_failed" && "Pago Fallido"}
                      {activity.type === "completion" && "Progreso"}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
