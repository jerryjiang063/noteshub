"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) root.classList.add("theme-transition");

    const next = (resolvedTheme ?? theme) === "dark" ? "light" : "dark";
    // RequestAnimationFrame to ensure transition class is applied before theme flip
    requestAnimationFrame(() => {
      setTheme(next);
      if (!prefersReduced) {
        window.setTimeout(() => root.classList.remove("theme-transition"), 750);
      }
    });
  }

  if (!mounted) return null;

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center rounded-full p-2 transition-colors bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
} 