"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      window.localStorage.setItem("ordexa-theme", next);
    } catch {
      return;
    }
  }

  return <button type="button" onClick={toggle} className="theme-toggle" aria-label="Alternar entre tema claro e escuro" title="Alternar tema">
    <Sun className="theme-icon-light" size={17} strokeWidth={1.8}/>
    <Moon className="theme-icon-dark" size={17} strokeWidth={1.8}/>
  </button>;
}
