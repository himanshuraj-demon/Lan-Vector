import home from "@/assets/icons/home.png";
import team from "@/assets/icons/team.png";
import voice from "@/assets/icons/voice.png";
import text from "@/assets/icons/mic.png";

export const icons = {
    home,
    team,
    voice,
    text,
 
} as const;

export type IconKey = keyof typeof icons;