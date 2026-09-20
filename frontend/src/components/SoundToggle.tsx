import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCabinet } from "@/context/Cabinet";

export function SoundToggle() {
  const { soundOn, toggleSound } = useCabinet();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={soundOn ? "secondary" : "ghost"} size="icon" onClick={toggleSound} aria-pressed={soundOn} aria-label="Effets sonores">
          {soundOn ? <Volume2Icon /> : <VolumeXIcon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{soundOn ? "Couper le son" : "Activer le son : battements et moniteur"}</TooltipContent>
    </Tooltip>
  );
}
