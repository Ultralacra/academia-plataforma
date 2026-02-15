"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/* ──────────────────── Animated mesh background ──────────────────── */
function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-[#fafafa] dark:bg-[#09090b]" />

      {/* Mesh blobs */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-amber-400/[0.08] dark:bg-amber-500/[0.06] blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-[15%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-orange-300/[0.07] dark:bg-orange-500/[0.05] blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -15, 25, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full bg-amber-200/[0.06] dark:bg-amber-600/[0.04] blur-[80px]"
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

/* ──────────────────── Main LoginForm ──────────────────── */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const { login, isLoading } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <>
      <MeshBackground />

      <div className="min-h-[100dvh] flex items-center justify-center p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[400px]"
        >
          {/* ── Glass card ── */}
          <div
            className="
            rounded-3xl
            border border-white/60 dark:border-white/[0.08]
            bg-white/70 dark:bg-white/[0.04]
            backdrop-blur-2xl backdrop-saturate-150
            shadow-[0_8px_60px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.4)]
            p-8 sm:p-10
          "
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
                type: "spring",
                stiffness: 200,
              }}
              className="flex justify-center mb-7"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-400/30 via-orange-400/20 to-amber-500/30 blur-md" />
                <img
                  src="https://valinkgroup.com/wp-content/uploads/2025/09/LogoHAHL600x600px2.jpg"
                  alt="Hotselling"
                  className="relative h-14 w-14 rounded-2xl object-cover shadow-lg"
                  loading="eager"
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-center mb-8"
            >
              <h1 className="text-[22px] sm:text-2xl font-bold text-foreground tracking-tight">
                Bienvenido de vuelta
              </h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Ingresa a tu cuenta de Hotselling
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              ref={formRef}
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="space-y-4"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="text-[13px] font-medium text-foreground/80 pl-0.5"
                >
                  Correo electrónico
                </label>
                <div
                  className={`
                    group relative flex items-center h-11 rounded-xl
                    border transition-all duration-300 ease-out
                    bg-white/80 dark:bg-white/[0.05]
                    ${
                      emailFocused
                        ? "border-amber-500/40 shadow-[0_0_0_3px_rgba(245,158,11,0.08)] dark:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
                        : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15]"
                    }
                  `}
                >
                  <Mail
                    className={`ml-3.5 h-4 w-4 shrink-0 transition-colors duration-200 ${emailFocused ? "text-amber-500" : "text-muted-foreground/50"}`}
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="tu@correo.com"
                    required
                    autoComplete="email"
                    className="flex-1 h-full bg-transparent pl-2.5 pr-3.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[13px] font-medium text-foreground/80 pl-0.5"
                >
                  Contraseña
                </label>
                <div
                  className={`
                    group relative flex items-center h-11 rounded-xl
                    border transition-all duration-300 ease-out
                    bg-white/80 dark:bg-white/[0.05]
                    ${
                      passFocused
                        ? "border-amber-500/40 shadow-[0_0_0_3px_rgba(245,158,11,0.08)] dark:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
                        : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15]"
                    }
                  `}
                >
                  <Lock
                    className={`ml-3.5 h-4 w-4 shrink-0 transition-colors duration-200 ${passFocused ? "text-amber-500" : "text-muted-foreground/50"}`}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="flex-1 h-full bg-transparent pl-2.5 pr-1 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="px-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/30 px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.005 }}
                className="
                  relative w-full h-11 mt-1 rounded-xl text-[13px] font-semibold
                  flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-foreground text-background
                  shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08)]
                  dark:shadow-[0_1px_2px_rgba(255,255,255,0.05),0_4px_12px_rgba(255,255,255,0.03)]
                  hover:opacity-90
                  active:shadow-[0_1px_2px_rgba(0,0,0,0.1)]
                  transition-all duration-200
                "
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ingresando…</span>
                  </>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </motion.button>
            </motion.form>
          </div>

          {/* Footer outside card */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-center text-[11px] text-muted-foreground/40 mt-6"
          >
            © {new Date().getFullYear()} Hotselling
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}
