"use client";
import React from "react";
import { BookingForm } from "../components/BookingForm";

// Página standalone para el formulario de reserva / lead intake.
// No usa DashboardLayout ni ProtectedRoute para permitir acceso público si se desea.
// Si luego se requiere protección, envolver con ProtectedRoute.
export default function BookingStandalonePage() {
  return <BookingForm />;
}
