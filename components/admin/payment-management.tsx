"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { dataService, type Payment, type Student, type Contract } from "@/lib/data-service"
import { Search, CreditCard, AlertTriangle, CheckCircle, XCircle, RefreshCw, FileText } from "lucide-react"

export function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const loadData = () => {
    setPayments(dataService.getPayments())
    setStudents(dataService.getStudents())
    setContracts(dataService.getContracts())
  }

  const filterPayments = () => {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter((payment) => {
        const student = getStudentName(payment.studentId)
        return (
          student.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter)
    }

    // Sort by payment date (newest first)
    filtered.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

    setFilteredPayments(filtered)
  }

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    return student?.name || "Estudiante desconocido"
  }

  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completado</Badge>
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>
      case "refunded":
        return <Badge variant="outline">Reembolsado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <CreditCard className="h-4 w-4 text-blue-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const handleUpdatePaymentStatus = (paymentId: string, newStatus: Payment["status"]) => {
    dataService.updatePayment(paymentId, { status: newStatus })
    loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getPaymentMetrics = () => {
    const completed = payments.filter((p) => p.status === "completed")
    const pending = payments.filter((p) => p.status === "pending")
    const failed = payments.filter((p) => p.status === "failed")

    const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalRevenue,
      pendingAmount,
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    }
  }

  const metrics = getPaymentMetrics()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Pagos</h2>
          <p className="text-muted-foreground">Administra pagos, facturación y contratos</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Payment Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                <div className="text-sm text-muted-foreground">Ingresos totales</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-bold">{formatCurrency(metrics.pendingAmount)}</div>
                <div className="text-sm text-muted-foreground">Pendiente de cobro</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-bold">{metrics.failedCount}</div>
                <div className="text-sm text-muted-foreground">Pagos fallidos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <div>
                <div className="font-bold">{contracts.filter((c) => c.status === "signed").length}</div>
                <div className="text-sm text-muted-foreground">Contratos firmados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por estudiante, factura o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
                <SelectItem value="refunded">Reembolsados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos ({filteredPayments.length})</CardTitle>
          <CardDescription>Lista de todos los pagos y transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{getStudentName(payment.studentId)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{payment.description}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{payment.invoiceNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{formatCurrency(payment.amount)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{new Date(payment.paymentDate).toLocaleDateString()}</div>
                      {payment.dueDate !== payment.paymentDate && (
                        <div className="text-xs text-muted-foreground">
                          Vence: {new Date(payment.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                            Ver Detalles
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Detalles del Pago</DialogTitle>
                            <DialogDescription>Información completa de la transacción</DialogDescription>
                          </DialogHeader>
                          {selectedPayment && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Estudiante</label>
                                  <p className="text-sm">{getStudentName(selectedPayment.studentId)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Monto</label>
                                  <p className="text-sm font-bold">{formatCurrency(selectedPayment.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Estado</label>
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(selectedPayment.status)}
                                    {getStatusBadge(selectedPayment.status)}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Método</label>
                                  <p className="text-sm capitalize">{selectedPayment.method}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Fecha de Pago</label>
                                  <p className="text-sm">{new Date(selectedPayment.paymentDate).toLocaleString()}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Fecha de Vencimiento</label>
                                  <p className="text-sm">{new Date(selectedPayment.dueDate).toLocaleString()}</p>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Descripción</label>
                                <p className="text-sm">{selectedPayment.description}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Número de Factura</label>
                                <p className="text-sm font-mono">{selectedPayment.invoiceNumber}</p>
                              </div>

                              {selectedPayment.status === "failed" && (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, "pending")}
                                  >
                                    Marcar como Pendiente
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, "completed")}
                                  >
                                    Marcar como Completado
                                  </Button>
                                </div>
                              )}

                              {selectedPayment.status === "pending" && (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, "failed")}
                                  >
                                    Marcar como Fallido
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, "completed")}
                                  >
                                    Marcar como Completado
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
