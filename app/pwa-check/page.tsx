import { PwaDiagnostics } from "./pwa-diagnostics";

export const metadata = {
  title: "PWA Check - Academia X",
};

export default function PwaCheckPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">PWA Check</h1>
        <p className="text-sm text-muted-foreground">
          Esta página sirve para diagnosticar por qué no aparece la opción de
          instalación en Android/iOS.
        </p>
        <PwaDiagnostics />
      </div>
    </main>
  );
}
