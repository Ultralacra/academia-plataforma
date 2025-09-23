"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dataService,
  type Student,
  type Course,
  type Coach,
  type Payment,
  type Contract,
} from "@/lib/data-service";
import {
  BookOpen,
  User as UserIcon,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function StudentCourseView() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);

  // diálogo de remoción
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Date[] | undefined>([]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;

    const studentData = dataService.getStudents().find((s) => s.id === user.id);
    if (!studentData) return;

    setStudent(studentData);

    const courseData = dataService
      .getCourses()
      .find((c) => c.id === studentData.courseId);
    setCourse(courseData || null);

    const coachData = dataService
      .getCoaches()
      .find((c) => c.id === studentData.coachId);
    setCoach(coachData || null);

    const studentPayments = dataService
      .getPayments()
      .filter((p) => p.studentId === user.id);
    setPayments(studentPayments);

    const studentContract = dataService
      .getContracts()
      .find((c) => c.studentId === user.id);
    setContract(studentContract || null);
  };

  const handleSubmitRemoval = () => {
    const count = selectedDays?.length ?? 0;
    if (count === 0) {
      toast({
        title: "Selecciona al menos un día",
        description:
          "Debes elegir uno o más días en el calendario para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Aquí podrías guardar/mandar a backend:
    // dataService.addRemovalRequest({ studentId: student!.id, dates: selectedDays, reason })

    const listado = (selectedDays || [])
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => format(d, "dd/MM/yyyy", { locale: es }))
      .join(", ");

    toast({
      title: "Solicitud enviada",
      description: `Se registró tu solicitud para ${count} día(s): ${listado}${
        reason ? ` · Motivo: ${reason}` : ""
      }`,
    });
    setRemoveOpen(false);
    setReason("");
    setSelectedDays([]);
  };

  const getPaymentStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Pagado</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>;
      case "refunded":
        return <Badge variant="outline">Reembolsado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!student || !course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">
          No tienes un curso asignado
        </h3>
        <p className="text-muted-foreground">
          Contacta con el administrador para que te asigne un curso.
        </p>
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi Curso</CardTitle>
            <BookOpen className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold">{course.title}</p>
                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Progreso:
                  </span>
                  <span className="text-sm font-medium">
                    {student.progress}%
                  </span>
                </div>
                <Progress value={student.progress} className="w-full" />
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarIcon className="h-3 w-3 mr-1" />
                Duración: {course.duration}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi Coach</CardTitle>
            <UserIcon className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-medium">{coach?.name || "Sin asignar"}</p>
                <p className="text-sm text-muted-foreground">{coach?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Especialización:
                </p>
                <p className="text-sm font-medium">
                  {coach?.specialization || "N/A"}
                </p>
              </div>
              <Badge variant={coach?.isActive ? "default" : "secondary"}>
                {coach?.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estado de Cuenta
            </CardTitle>
            <CreditCard className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total pagado:
                </span>
                <span className="text-lg font-bold text-green-600">
                  €{totalPaid}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Pagos pendientes:
                </span>
                <Badge
                  variant={
                    pendingPayments.length > 0 ? "destructive" : "default"
                  }
                >
                  {pendingPayments.length}
                </Badge>
              </div>
              <div className="flex items-center text-sm">
                {contract?.status === "signed" ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Contrato firmado
                  </div>
                ) : (
                  <div className="flex items-center text-orange-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    Contrato pendiente
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas */}
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Contenido</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Mis Pagos</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Contrato</span>
          </TabsTrigger>
          <TabsTrigger value="bonuses" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Bonos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Módulos del Curso</CardTitle>
              <CardDescription>
                Contenido y lecciones disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <div key={module.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{module.title}</h4>
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.content}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Lección {lesson.order}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Todos tus pagos y transacciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Vencimiento:{" "}
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Factura: {payment.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">€{payment.amount}</p>
                      {getPaymentStatusBadge(payment.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.status === "completed"
                          ? "Pagado"
                          : "Pendiente"}
                        : {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay pagos registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract">
          <Card>
            <CardHeader>
              <CardTitle>Mi Contrato</CardTitle>
              <CardDescription>
                Estado y detalles de tu contrato de servicios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contract ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estado del contrato:
                      </p>
                      <Badge
                        variant={
                          contract.status === "signed" ? "default" : "secondary"
                        }
                      >
                        {contract.status === "signed" ? "Firmado" : "Pendiente"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monto total:
                      </p>
                      <p className="font-bold">€{contract.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Plan de pago:
                      </p>
                      <p className="font-medium capitalize">
                        {contract.paymentPlan}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fecha de firma:
                      </p>
                      <p className="font-medium">
                        {contract.signedAt
                          ? new Date(contract.signedAt).toLocaleDateString()
                          : "No firmado"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Términos del contrato:
                    </p>
                    <div className="bg-muted p-4 rounded text-sm whitespace-pre-line">
                      {contract.terms}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay contrato disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Bonos</CardTitle>
              <CardDescription>
                Solicita la remoción de accesos a bonos adicionales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Bonos Activos</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Acceso a masterclasses exclusivas</li>
                    <li>• Biblioteca de recursos premium</li>
                    <li>• Sesiones de mentoría grupal</li>
                    <li>• Certificación oficial del curso</li>
                  </ul>
                </div>

                <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-800">
                        Solicitar Remoción de Accesos
                      </h4>
                      <p className="text-sm text-orange-700">
                        Elige los <b>días</b> en los que quieres dar de baja tus
                        accesos. Puedes seleccionar uno o varios días.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={() => setRemoveOpen(true)}
                      >
                        Abrir calendario
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo: seleccionar días a dar de baja */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecciona días para dar de baja</DialogTitle>
            <DialogDescription>
              Haz clic en el calendario para elegir uno o varios días. Vuelve a
              hacer clic para deseleccionar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <Calendar
              mode="multiple"
              selected={selectedDays}
              onSelect={setSelectedDays}
              locale={es}
              className="rounded-md border"
            />

            <div>
              <p className="text-sm font-medium mb-2">Motivo (opcional)</p>
              <Textarea
                placeholder="Cuéntanos por qué solicitas la remoción de acceso en esas fechas…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedDays?.length
                  ? `${selectedDays.length} día(s) seleccionado(s):`
                  : "Sin fechas seleccionadas"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(selectedDays || [])
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((d) => (
                    <Badge key={d.toISOString()} variant="outline">
                      {format(d, "dd/MM/yyyy", { locale: es })}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRemoval}>Enviar solicitud</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
