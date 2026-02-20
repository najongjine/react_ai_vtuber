export const speak = (
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void
) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
        // Clean text (remove special characters that might interfere with TTS)
        const cleanText = text.replace(/[*#\-]/g, "").trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "ko-KR";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const korVoice = voices.find(
            (v) => v.lang === "ko-KR" && v.name.includes("Google")
        );
        if (korVoice) utterance.voice = korVoice;

        utterance.onstart = () => onStart && onStart();
        utterance.onend = () => onEnd && onEnd();
        utterance.onerror = () => onError && onError();

        window.speechSynthesis.speak(utterance);
    }
};
