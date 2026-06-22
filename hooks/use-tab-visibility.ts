"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook that tracks whether the browser tab is visible and focused.
 */
export function useTabVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const handleVisibility = () =>
      setIsVisible(document.visibilityState === "visible");
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    setIsVisible(document.visibilityState === "visible");
    setIsFocused(document.hasFocus());

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return { isVisible, isFocused };
}

/**
 * Returns a stable ref that tracks tab active state (visible + focused).
 * Useful inside async callbacks where React state would be stale.
 */
export function useTabActiveRef() {
  const activeRef = useRef(true);

  useEffect(() => {
    const update = () => {
      activeRef.current =
        document.visibilityState === "visible" && document.hasFocus();
    };
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    update();

    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  return activeRef;
}
