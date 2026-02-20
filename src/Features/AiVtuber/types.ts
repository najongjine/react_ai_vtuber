import { MAO_MOTIONS } from "./utils/constants";

export interface ChatMessage {
    role: "user" | "ai";
    text: string;
    images?: string[]; // Image preview URLs
}

export interface Live2DController {
    playMotion: (motionKey: keyof typeof MAO_MOTIONS) => void;
    setExpression: (expressionId: string) => void;
    stopSpeaking: () => void;
}
