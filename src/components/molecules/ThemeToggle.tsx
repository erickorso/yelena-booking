"use client";

import { useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/atoms/Button";

/**
 * Alterna claro/oscuro. Iconos vía clases `dark:` (sin gate de mounted).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggle = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Cambiar tema"
    >
      <Sun
        className="size-4 scale-100 text-stone-800 transition-transform dark:scale-0 dark:text-slate-100"
        aria-hidden
      />
      <Moon
        className="absolute size-4 scale-0 text-stone-800 transition-transform dark:scale-100 dark:text-slate-100"
        aria-hidden
      />
    </Button>
  );
}
