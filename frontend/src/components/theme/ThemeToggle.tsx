import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Changer de thème">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{theme === "dark" ? "Mode clair" : "Mode sombre"}</TooltipContent>
    </Tooltip>
  );
}
