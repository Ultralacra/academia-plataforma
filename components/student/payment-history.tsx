"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { dataService, type Payment, type Student, type Contract } from "@/lib/data-service"
import { useAuth } from "@/hooks/use-auth"
import { CreditCard, Calendar, FileText, AlertTriangle, CheckCircle, Download } from "lucide-react"

export function PaymentHistory() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [contract, setContract] = useState<Contract | null>(null)

  useEffect(() => {
    if (user?.role === "student") {
      loadStudentData()
    }
  }, [user])

  const loadStudentData = () => {
    const students = dataService.getStudents()
    const currentStudent = students.find((s) => s.email === user?.email)

    if (currentStudent) {
      setStudent(currentStudent)

      // Load payments for this student
      const allPayments = dataService.getPayments()
      const studentPayments = allPayments.filter((p) => p.studentId === currentStudent.id)
      setPayments(studentPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()))

      // Load contract for this student
      const contracts = dataService.getContracts()
      const studentContract = contracts.find((c) => c.studentId === currentStudent.id)
      setContract(studentContract || null)
    }
  }

  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Pagado</Badge>
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
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "refunded":
        return <CreditCard className="h-4 w-4 text-orange-500" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
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

    const totalPaid = completed.reduce((sum, p) => sum + p.amount, 0)
    const totalPending = pending.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalPaid,
      totalPending,
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    }
  }

  const getNextPayment = () => {
    const pendingPayments = payments.filter((p) => p.status === "pending")
    if (pendingPayments.length === 0) return null

    return pendingPayments.reduce((earliest, current) => {
      return new Date(current.dueDate) < new Date(earliest.dueDate) ? current : earliest
    })
  }

  const getContractStatusBadge = (status: Contract["status"]) => {
    switch (status) {
      case "signed":
        return <Badge variant="default">Firmado</Badge>
      case "sent":
        return <Badge variant="secondary">Enviado</Badge>
      case "draft":
        return <Badge variant="outline">Borrador</Badge>
      case "expired":
        return <Badge variant="destructive">Expirado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No se encontró información del estudiante</h3>
        <p className="text-muted-foreground">Contacta con soporte para resolver este problema.</p>
      </div>
    )
  }

  const metrics = getPaymentMetrics()
  const nextPayment = getNextPayment()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Mis Pagos y Facturación</h2>
          <p className="text-muted-foreground">Gestiona tus pagos, facturas y contrato</p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-bold">{formatCurrency(metrics.totalPaid)}</div>
                <div className="text-sm text-muted-foreground">Total pagado</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-bold">{formatCurrency(metrics.totalPending)}</div>
                <div className="text-sm text-muted-foreground">Pendiente de pago</div>
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
      </div>

      {/* Next Payment */}
      {nextPayment && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Próximo Pago</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{nextPayment.description}</h3>
                <p className="text-sm text-muted-foreground">
                  Vence el {new Date(nextPayment.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{formatCurrency(nextPayment.amount)}</div>
                <Button size="sm" className="mt-2">
                  Pagar Ahora
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Information */}
      {contract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Mi Contrato</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Contrato de Servicios Educativos</h3>
                  <p className="text-sm text-muted-foreground">
                    Creado el {new Date(contract.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getContractStatusBadge(contract.status)}
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Descargar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Monto total:</span>
                  <span className="font-medium ml-2">{formatCurrency(contract.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plan de pago:</span>
                  <span className="font-medium ml-2 capitalize">{contract.paymentPlan}</span>
                </div>
                {contract.signedAt && (
                  <div>
                    <span className="text-muted-foreground">Firmado el:</span>
                    <span className="font-medium ml-2">{new Date(contract.signedAt).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Expira el:</span>
                  <span className="font-medium ml-2">{new Date(contract.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>

              {contract.status === "sent" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Acción requerida</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    Tu contrato está pendiente de firma. Por favor, revísalo y fírmalo para activar tu acceso completo
                    al curso.
                  </p>
                  <Button size="sm" className="mt-2">
                    Firmar Contrato
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>Todos tus pagos y transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <h3 className="font-medium">{payment.description}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Factura: {payment.invoiceNumber}</span>
                        <span>Fecha: {new Date(payment.paymentDate).toLocaleDateString()}</span>
                        <span className="capitalize">Método: {payment.method}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(payment.amount)}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(payment.status)}
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        Factura
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay pagos registrados</h3>
              <p className="text-muted-foreground">Tus pagos aparecerán aquí una vez que se procesen.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
