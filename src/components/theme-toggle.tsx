import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/* Icon button matching the bell/sign-out chrome in the shells. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="pressable text-muted hover:text-ink p-2 rounded-lg hover:bg-soft transition-colors"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
