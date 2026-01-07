import { redirect } from "next/navigation";

// El formulario ahora es público (fuera de /admin): /booking
export default function BookingStandalonePage() {
  redirect("/booking");
}
