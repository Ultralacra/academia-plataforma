"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { StudentCourseView } from "@/components/student/student-course-view"

function StudentCoursePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <StudentCourseView />
      </div>
    </DashboardLayout>
  )
}

export default function StudentCoursePageWrapper() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentCoursePage />
    </ProtectedRoute>
  )
}
