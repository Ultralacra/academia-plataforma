// Service for managing all platform data in localStorage
export interface Student {
  id: string
  name: string
  email: string
  coachId: string
  courseId: string
  enrollmentDate: string
  status: "active" | "suspended" | "completed" | "dropped"
  paymentPlan: "monthly" | "quarterly" | "full"
  nextPaymentDate: string
  progress: number
  contractSigned: boolean
}

export interface Coach {
  id: string
  name: string
  email: string
  specialization: string
  studentsAssigned: string[]
  isActive: boolean
  joinDate: string
}

export interface Course {
  id: string
  title: string
  description: string
  price: number
  duration: string
  modules: Module[]
}

export interface Module {
  id: string
  title: string
  lessons: Lesson[]
  order: number
}

export interface Lesson {
  id: string
  title: string
  content: string
  order: number
}

export interface Ticket {
  id: string
  studentId: string
  coachId: string
  courseId: string // Added courseId to relate ticket to specific course
  title: string
  description: string
  status: "open" | "in-progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high"
  category: "technical" | "academic" | "payment" | "general"
  createdAt: string
  updatedAt: string
  responses: TicketResponse[]
}

export interface TicketResponse {
  id: string
  authorId: string
  authorRole: "coach" | "student" | "admin"
  message: string
  createdAt: string
  attachments?: string[]
}

export interface Payment {
  id: string
  studentId: string
  amount: number
  status: "pending" | "completed" | "failed" | "refunded"
  paymentDate: string
  dueDate: string
  method: "stripe" | "manual"
  description?: string
  invoiceNumber?: string
}

export interface Contract {
  id: string
  studentId: string
  courseId: string
  templateId: string
  status: "draft" | "sent" | "signed" | "expired"
  createdAt: string
  signedAt?: string
  expiresAt: string
  terms: string
  totalAmount: number
  paymentPlan: "monthly" | "quarterly" | "full"
}

export interface PaymentPlan {
  id: string
  name: string
  type: "monthly" | "quarterly" | "full"
  installments: number
  totalAmount: number
  installmentAmount: number
  description: string
}

export interface PlatformMetrics {
  totalStudents: number
  activeStudents: number
  suspendedStudents: number
  totalRevenue: number
  monthlyRevenue: number
  averageProgress: number
  ticketsOpen: number
  ticketsResolved: number
  averageResolutionTime: number
  churnRate: number
}

export interface Assignment {
  id: string
  lessonId: string
  title: string
  description: string
  instructions: string
  dueDate: string
  maxScore: number
  attachments?: string[]
}

export interface StudentAssignment {
  id: string
  assignmentId: string
  studentId: string
  submissionDate?: string
  content: string
  attachments?: string[]
  score?: number
  feedback?: string
  status: "pending" | "submitted" | "graded" | "needs_revision"
  coachId: string
}

class DataService {
  private studentsKey = "academy_students"
  private coachesKey = "academy_coaches"
  private coursesKey = "academy_courses"
  private ticketsKey = "academy_tickets"
  private paymentsKey = "academy_payments"
  private assignmentsKey = "academy_assignments"
  private studentAssignmentsKey = "academy_student_assignments"
  private contractsKey = "academy_contracts"
  private paymentPlansKey = "academy_payment_plans"

  constructor() {
    this.initializeData()
  }

  private initializeData() {
    if (typeof window === "undefined") return

    // Initialize with demo data if not exists
    if (!localStorage.getItem(this.studentsKey)) {
      this.setStudents(this.generateDemoStudents())
    }
    if (!localStorage.getItem(this.coachesKey)) {
      this.setCoaches(this.generateDemoCoaches())
    }
    if (!localStorage.getItem(this.coursesKey)) {
      this.setCourses(this.generateDemoCourses())
    }
    if (!localStorage.getItem(this.ticketsKey)) {
      this.setTickets(this.generateDemoTickets())
    }
    if (!localStorage.getItem(this.paymentsKey)) {
      this.setPayments(this.generateDemoPayments())
    }
    if (!localStorage.getItem(this.assignmentsKey)) {
      this.setAssignments(this.generateDemoAssignments())
    }
    if (!localStorage.getItem(this.studentAssignmentsKey)) {
      this.setStudentAssignments(this.generateDemoStudentAssignments())
    }
    if (!localStorage.getItem(this.contractsKey)) {
      this.setContracts(this.generateDemoContracts())
    }
    if (!localStorage.getItem(this.paymentPlansKey)) {
      this.setPaymentPlans(this.generateDemoPaymentPlans())
    }
  }

  // Students
  getStudents(): Student[] {
    return this.getFromStorage(this.studentsKey, [])
  }

  setStudents(students: Student[]): void {
    this.setToStorage(this.studentsKey, students)
  }

  addStudent(student: Student): void {
    const students = this.getStudents()
    students.push(student)
    this.setStudents(students)
  }

  updateStudent(id: string, updates: Partial<Student>): void {
    const students = this.getStudents()
    const index = students.findIndex((s) => s.id === id)
    if (index !== -1) {
      students[index] = { ...students[index], ...updates }
      this.setStudents(students)
    }
  }

  // Coaches
  getCoaches(): Coach[] {
    return this.getFromStorage(this.coachesKey, [])
  }

  setCoaches(coaches: Coach[]): void {
    this.setToStorage(this.coachesKey, coaches)
  }

  // Courses
  getCourses(): Course[] {
    return this.getFromStorage(this.coursesKey, [])
  }

  setCourses(courses: Course[]): void {
    this.setToStorage(this.coursesKey, courses)
  }

  // Tickets
  getTickets(): Ticket[] {
    return this.getFromStorage(this.ticketsKey, [])
  }

  setTickets(tickets: Ticket[]): void {
    this.setToStorage(this.ticketsKey, tickets)
  }

  // Payments
  getPayments(): Payment[] {
    return this.getFromStorage(this.paymentsKey, [])
  }

  setPayments(payments: Payment[]): void {
    this.setToStorage(this.paymentsKey, payments)
  }

  addPayment(payment: Payment): void {
    const payments = this.getPayments()
    payments.push(payment)
    this.setPayments(payments)
  }

  updatePayment(id: string, updates: Partial<Payment>): void {
    const payments = this.getPayments()
    const index = payments.findIndex((p) => p.id === id)
    if (index !== -1) {
      payments[index] = { ...payments[index], ...updates }
      this.setPayments(payments)
    }
  }

  // Assignments
  getAssignments(): Assignment[] {
    return this.getFromStorage(this.assignmentsKey, [])
  }

  setAssignments(assignments: Assignment[]): void {
    this.setToStorage(this.assignmentsKey, assignments)
  }

  addAssignment(assignment: Assignment): void {
    const assignments = this.getAssignments()
    assignments.push(assignment)
    this.setAssignments(assignments)
  }

  // Student Assignments
  getStudentAssignments(): StudentAssignment[] {
    return this.getFromStorage(this.studentAssignmentsKey, [])
  }

  setStudentAssignments(studentAssignments: StudentAssignment[]): void {
    this.setToStorage(this.studentAssignmentsKey, studentAssignments)
  }

  addStudentAssignment(studentAssignment: StudentAssignment): void {
    const studentAssignments = this.getStudentAssignments()
    studentAssignments.push(studentAssignment)
    this.setStudentAssignments(studentAssignments)
  }

  updateStudentAssignment(id: string, updates: Partial<StudentAssignment>): void {
    const studentAssignments = this.getStudentAssignments()
    const index = studentAssignments.findIndex((sa) => sa.id === id)
    if (index !== -1) {
      studentAssignments[index] = { ...studentAssignments[index], ...updates }
      this.setStudentAssignments(studentAssignments)
    }
  }

  // Contracts
  getContracts(): Contract[] {
    return this.getFromStorage(this.contractsKey, [])
  }

  setContracts(contracts: Contract[]): void {
    this.setToStorage(this.contractsKey, contracts)
  }

  addContract(contract: Contract): void {
    const contracts = this.getContracts()
    contracts.push(contract)
    this.setContracts(contracts)
  }

  updateContract(id: string, updates: Partial<Contract>): void {
    const contracts = this.getContracts()
    const index = contracts.findIndex((c) => c.id === id)
    if (index !== -1) {
      contracts[index] = { ...contracts[index], ...updates }
      this.setContracts(contracts)
    }
  }

  // Payment Plans
  getPaymentPlans(): PaymentPlan[] {
    return this.getFromStorage(this.paymentPlansKey, [])
  }

  setPaymentPlans(paymentPlans: PaymentPlan[]): void {
    this.setToStorage(this.paymentPlansKey, paymentPlans)
  }

  // Metrics calculation
  getMetrics(): PlatformMetrics {
    const students = this.getStudents()
    const tickets = this.getTickets()
    const payments = this.getPayments()

    const activeStudents = students.filter((s) => s.status === "active").length
    const suspendedStudents = students.filter((s) => s.status === "suspended").length
    const totalRevenue = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)

    const currentMonth = new Date().getMonth()
    const monthlyRevenue = payments
      .filter((p) => p.status === "completed" && new Date(p.paymentDate).getMonth() === currentMonth)
      .reduce((sum, p) => sum + p.amount, 0)

    const averageProgress = students.reduce((sum, s) => sum + s.progress, 0) / students.length || 0

    const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in-progress").length
    const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length

    // Calculate average resolution time (simplified)
    const resolvedTicketsWithTime = tickets.filter((t) => t.status === "resolved" || t.status === "closed")
    const averageResolutionTime =
      resolvedTicketsWithTime.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime()
        const updated = new Date(t.updatedAt).getTime()
        return sum + (updated - created) / (1000 * 60 * 60) // hours
      }, 0) / resolvedTicketsWithTime.length || 0

    const churnRate = (students.filter((s) => s.status === "dropped").length / students.length) * 100 || 0

    return {
      totalStudents: students.length,
      activeStudents,
      suspendedStudents,
      totalRevenue,
      monthlyRevenue,
      averageProgress,
      ticketsOpen: openTickets,
      ticketsResolved: resolvedTickets,
      averageResolutionTime,
      churnRate,
    }
  }

  // Utility methods
  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private setToStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error saving to localStorage:`, error)
    }
  }

  // Demo data generators
  private generateDemoStudents(): Student[] {
    return [
      {
        id: "1",
        name: "Ana García",
        email: "ana@example.com",
        coachId: "2", // Updated to match coach ID from auth system
        courseId: "1",
        enrollmentDate: "2024-01-15",
        status: "active",
        paymentPlan: "monthly",
        nextPaymentDate: "2024-12-15",
        progress: 75,
        contractSigned: true,
      },
      {
        id: "2",
        name: "Carlos López",
        email: "carlos@example.com",
        coachId: "2", // Updated to match coach ID from auth system
        courseId: "1",
        enrollmentDate: "2024-02-01",
        status: "active",
        paymentPlan: "quarterly",
        nextPaymentDate: "2024-12-01",
        progress: 60,
        contractSigned: true,
      },
      {
        id: "3",
        name: "María Rodríguez",
        email: "maria@example.com",
        coachId: "2", // Updated to match coach ID from auth system
        courseId: "2",
        enrollmentDate: "2024-03-10",
        status: "suspended",
        paymentPlan: "monthly",
        nextPaymentDate: "2024-11-10",
        progress: 45,
        contractSigned: true,
      },
    ]
  }

  private generateDemoCoaches(): Coach[] {
    return [
      {
        id: "1",
        name: "Dr. Elena Martínez",
        email: "elena@academy.com",
        specialization: "Marketing Digital",
        studentsAssigned: [],
        isActive: true,
        joinDate: "2023-06-01",
      },
      {
        id: "2", // Updated to match coach ID from auth system
        name: "Coach Mentor",
        email: "coach@academy.com",
        specialization: "Desarrollo Web",
        studentsAssigned: ["1", "2", "3"],
        isActive: true,
        joinDate: "2023-08-15",
      },
    ]
  }

  private generateDemoCourses(): Course[] {
    return [
      {
        id: "1",
        title: "Marketing Digital Avanzado",
        description: "Curso completo de marketing digital para empresas",
        price: 2500,
        duration: "12 semanas",
        modules: [
          {
            id: "1",
            title: "Fundamentos del Marketing Digital",
            order: 1,
            lessons: [
              {
                id: "1",
                title: "Introducción al Marketing Digital",
                content:
                  "En esta lección aprenderás los conceptos básicos del marketing digital, incluyendo canales, métricas y estrategias fundamentales.",
                order: 1,
              },
              {
                id: "2",
                title: "Estrategias de Contenido",
                content:
                  "Descubre cómo crear contenido que conecte con tu audiencia y genere engagement en diferentes plataformas digitales.",
                order: 2,
              },
              {
                id: "3",
                title: "SEO y SEM Básico",
                content:
                  "Aprende los fundamentos del posicionamiento orgánico y la publicidad en buscadores para aumentar tu visibilidad online.",
                order: 3,
              },
            ],
          },
          {
            id: "2",
            title: "Redes Sociales y Community Management",
            order: 2,
            lessons: [
              {
                id: "4",
                title: "Estrategia en Redes Sociales",
                content:
                  "Desarrolla una estrategia integral para redes sociales que alinee con tus objetivos de negocio.",
                order: 1,
              },
              {
                id: "5",
                title: "Creación de Contenido Visual",
                content:
                  "Aprende a crear contenido visual atractivo usando herramientas profesionales y principios de diseño.",
                order: 2,
              },
            ],
          },
        ],
      },
      {
        id: "2",
        title: "Desarrollo Web Full Stack",
        description: "Aprende a desarrollar aplicaciones web completas",
        price: 3000,
        duration: "16 semanas",
        modules: [
          {
            id: "3",
            title: "Frontend con React",
            order: 1,
            lessons: [
              {
                id: "6",
                title: "Componentes y JSX",
                content:
                  "Aprende a crear componentes reutilizables en React y domina la sintaxis JSX para construir interfaces dinámicas.",
                order: 1,
              },
              {
                id: "7",
                title: "Estado y Props",
                content: "Comprende cómo manejar el estado de los componentes y pasar datos entre ellos usando props.",
                order: 2,
              },
              {
                id: "8",
                title: "Hooks y Context API",
                content:
                  "Domina los hooks de React y aprende a gestionar el estado global de tu aplicación con Context API.",
                order: 3,
              },
            ],
          },
          {
            id: "4",
            title: "Backend con Node.js",
            order: 2,
            lessons: [
              {
                id: "9",
                title: "APIs REST con Express",
                content:
                  "Construye APIs robustas usando Express.js y aprende las mejores prácticas para el desarrollo backend.",
                order: 1,
              },
              {
                id: "10",
                title: "Base de Datos y MongoDB",
                content: "Integra bases de datos NoSQL en tus aplicaciones y aprende a modelar datos eficientemente.",
                order: 2,
              },
            ],
          },
        ],
      },
    ]
  }

  private generateDemoTickets(): Ticket[] {
    return [
      {
        id: "1",
        studentId: "1",
        coachId: "2",
        courseId: "1", // Added courseId to relate ticket to specific course
        title: "Problema con acceso al módulo 3 - Marketing Digital",
        description:
          "No puedo acceder al contenido del módulo 3 del curso de Marketing Digital, me aparece un error cuando intento abrir las lecciones.",
        status: "open",
        priority: "medium",
        category: "technical",
        createdAt: "2024-12-01T10:00:00Z",
        updatedAt: "2024-12-01T10:00:00Z",
        responses: [],
      },
      {
        id: "2",
        studentId: "2",
        coachId: "2",
        courseId: "1", // Added courseId
        title: "Consulta sobre tarea final - Estrategias de Contenido",
        description:
          "Tengo dudas sobre los requisitos de la tarea final del módulo 2 de Marketing Digital. ¿Podrías ayudarme?",
        status: "resolved",
        priority: "low",
        category: "academic",
        createdAt: "2024-11-28T14:30:00Z",
        updatedAt: "2024-11-29T09:15:00Z",
        responses: [
          {
            id: "1",
            authorId: "2",
            authorRole: "coach",
            message:
              "Los requisitos están en el documento adjunto al módulo 2. También puedes revisar los ejemplos que subí la semana pasada.",
            createdAt: "2024-11-29T09:15:00Z",
          },
        ],
      },
      {
        id: "3",
        studentId: "3",
        coachId: "2",
        courseId: "2", // Added courseId for web development course
        title: "Problema con el pago mensual",
        description:
          "Mi tarjeta fue rechazada y no puedo acceder al contenido del curso de Desarrollo Web. ¿Cómo puedo solucionarlo?",
        status: "in-progress",
        priority: "high",
        category: "payment",
        createdAt: "2024-12-02T16:45:00Z",
        updatedAt: "2024-12-02T17:30:00Z",
        responses: [
          {
            id: "2",
            authorId: "2",
            authorRole: "coach",
            message:
              "He escalado tu caso al equipo de pagos. Te contactarán en las próximas 24 horas para resolver el problema.",
            createdAt: "2024-12-02T17:30:00Z",
          },
        ],
      },
    ]
  }

  private generateDemoPayments(): Payment[] {
    return [
      {
        id: "1",
        studentId: "1",
        amount: 250,
        status: "completed",
        paymentDate: "2024-11-15",
        dueDate: "2024-11-15",
        method: "stripe",
        description: "Pago mensual - Marketing Digital Avanzado",
        invoiceNumber: "INV-2024-001",
      },
      {
        id: "2",
        studentId: "2",
        amount: 750,
        status: "completed",
        paymentDate: "2024-11-01",
        dueDate: "2024-11-01",
        method: "stripe",
        description: "Pago trimestral - Marketing Digital Avanzado",
        invoiceNumber: "INV-2024-002",
      },
      {
        id: "3",
        studentId: "3",
        amount: 250,
        status: "failed",
        paymentDate: "2024-11-10",
        dueDate: "2024-11-10",
        method: "stripe",
        description: "Pago mensual - Desarrollo Web Full Stack",
        invoiceNumber: "INV-2024-003",
      },
      {
        id: "4",
        studentId: "1",
        amount: 250,
        status: "pending",
        paymentDate: "2024-12-15",
        dueDate: "2024-12-15",
        method: "stripe",
        description: "Pago mensual - Marketing Digital Avanzado",
        invoiceNumber: "INV-2024-004",
      },
      {
        id: "5",
        studentId: "2",
        amount: 750,
        status: "pending",
        paymentDate: "2024-12-01",
        dueDate: "2024-12-01",
        method: "stripe",
        description: "Pago trimestral - Marketing Digital Avanzado",
        invoiceNumber: "INV-2024-005",
      },
    ]
  }

  private generateDemoAssignments(): Assignment[] {
    return [
      {
        id: "1",
        lessonId: "2",
        title: "Estrategia de Contenido para Redes Sociales",
        description: "Desarrolla una estrategia de contenido completa para una marca ficticia",
        instructions:
          "1. Elige una marca o empresa ficticia\n2. Define su público objetivo\n3. Crea un calendario de contenido para 1 mes\n4. Incluye al menos 3 tipos de contenido diferentes\n5. Justifica tus decisiones estratégicas",
        dueDate: "2024-12-20",
        maxScore: 100,
      },
      {
        id: "2",
        lessonId: "3",
        title: "Análisis SEO de Sitio Web",
        description: "Realiza un análisis SEO completo de un sitio web existente",
        instructions:
          "1. Selecciona un sitio web de tu elección\n2. Analiza palabras clave principales\n3. Evalúa la estructura técnica SEO\n4. Identifica oportunidades de mejora\n5. Presenta un plan de acción con prioridades",
        dueDate: "2024-12-25",
        maxScore: 100,
      },
      {
        id: "3",
        lessonId: "6",
        title: "Componente React Interactivo",
        description: "Crea un componente React funcional con interactividad",
        instructions:
          "1. Desarrolla un componente de lista de tareas (To-Do List)\n2. Implementa funcionalidades: agregar, eliminar, marcar como completado\n3. Usa hooks (useState, useEffect)\n4. Aplica estilos CSS o styled-components\n5. Incluye validación de formularios",
        dueDate: "2024-12-30",
        maxScore: 100,
      },
    ]
  }

  private generateDemoStudentAssignments(): StudentAssignment[] {
    return [
      {
        id: "1",
        assignmentId: "1",
        studentId: "1",
        submissionDate: "2024-12-18",
        content:
          "He desarrollado una estrategia de contenido para una marca de café artesanal llamada 'Café Origen'. El público objetivo son millennials urbanos interesados en productos sostenibles...",
        status: "graded",
        score: 85,
        feedback:
          "Excelente trabajo en la definición del público objetivo. La estrategia es coherente y bien fundamentada. Para mejorar, considera incluir más métricas específicas para medir el éxito.",
        coachId: "2",
      },
      {
        id: "2",
        assignmentId: "2",
        studentId: "2",
        submissionDate: "2024-12-19",
        content:
          "Análisis SEO del sitio web www.ejemplo-tienda.com. Palabras clave principales identificadas: 'ropa sostenible', 'moda ética', 'tienda online eco'...",
        status: "graded",
        score: 92,
        feedback:
          "Análisis muy completo y profesional. Has identificado correctamente las oportunidades principales. El plan de acción es realista y bien priorizado.",
        coachId: "2",
      },
      {
        id: "3",
        assignmentId: "1",
        studentId: "3",
        content: "Estrategia de contenido para una startup de tecnología educativa...",
        status: "submitted",
        coachId: "2",
      },
      {
        id: "4",
        assignmentId: "3",
        studentId: "1",
        status: "pending",
        content: "",
        coachId: "2",
      },
    ]
  }

  private generateDemoContracts(): Contract[] {
    return [
      {
        id: "1",
        studentId: "1",
        courseId: "1",
        templateId: "template-1",
        status: "signed",
        createdAt: "2024-01-10T10:00:00Z",
        signedAt: "2024-01-12T14:30:00Z",
        expiresAt: "2025-01-10T10:00:00Z",
        terms: `CONTRATO DE SERVICIOS EDUCATIVOS

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios educativos para el curso "Marketing Digital Avanzado".

2. DURACIÓN
El curso tendrá una duración de 12 semanas a partir de la fecha de inicio.

3. PRECIO Y FORMA DE PAGO
El precio total del curso es de €2,500, pagadero según el plan mensual seleccionado.

4. OBLIGACIONES DEL ESTUDIANTE
- Participar activamente en las clases y actividades
- Cumplir con las tareas y evaluaciones
- Mantener al día los pagos según el plan acordado

5. POLÍTICA DE CANCELACIÓN
El estudiante puede cancelar el curso con 30 días de anticipación.`,
        totalAmount: 2500,
        paymentPlan: "monthly",
      },
      {
        id: "2",
        studentId: "2",
        courseId: "1",
        templateId: "template-1",
        status: "signed",
        createdAt: "2024-01-25T09:00:00Z",
        signedAt: "2024-01-26T16:45:00Z",
        expiresAt: "2025-01-25T09:00:00Z",
        terms: `CONTRATO DE SERVICIOS EDUCATIVOS

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios educativos para el curso "Marketing Digital Avanzado".

2. DURACIÓN
El curso tendrá una duración de 12 semanas a partir de la fecha de inicio.

3. PRECIO Y FORMA DE PAGO
El precio total del curso es de €2,500, pagadero según el plan trimestral seleccionado.

4. OBLIGACIONES DEL ESTUDIANTE
- Participar activamente en las clases y actividades
- Cumplir con las tareas y evaluaciones
- Mantener al día los pagos según el plan acordado

5. POLÍTICA DE CANCELACIÓN
El estudiante puede cancelar el curso con 30 días de anticipación.`,
        totalAmount: 2500,
        paymentPlan: "quarterly",
      },
      {
        id: "3",
        studentId: "3",
        courseId: "2",
        templateId: "template-2",
        status: "sent",
        createdAt: "2024-03-05T11:00:00Z",
        expiresAt: "2024-03-20T11:00:00Z",
        terms: `CONTRATO DE SERVICIOS EDUCATIVOS

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios educativos para el curso "Desarrollo Web Full Stack".

2. DURACIÓN
El curso tendrá una duración de 16 semanas a partir de la fecha de inicio.

3. PRECIO Y FORMA DE PAGO
El precio total del curso es de €3,000, pagadero según el plan mensual seleccionado.

4. OBLIGACIONES DEL ESTUDIANTE
- Participar activamente en las clases y actividades
- Cumplir con las tareas y evaluaciones
- Mantener al día los pagos según el plan acordado

5. POLÍTICA DE CANCELACIÓN
El estudiante puede cancelar el curso con 30 días de anticipación.`,
        totalAmount: 3000,
        paymentPlan: "monthly",
      },
    ]
  }

  private generateDemoPaymentPlans(): PaymentPlan[] {
    return [
      {
        id: "1",
        name: "Plan Mensual",
        type: "monthly",
        installments: 12,
        totalAmount: 2500,
        installmentAmount: 208.33,
        description: "Pago mensual durante 12 meses",
      },
      {
        id: "2",
        name: "Plan Trimestral",
        type: "quarterly",
        installments: 4,
        totalAmount: 2500,
        installmentAmount: 625,
        description: "Pago trimestral durante 1 año",
      },
      {
        id: "3",
        name: "Pago Completo",
        type: "full",
        installments: 1,
        totalAmount: 2500,
        installmentAmount: 2500,
        description: "Pago único con descuento del 10%",
      },
    ]
  }
}

export const dataService = new DataService()
