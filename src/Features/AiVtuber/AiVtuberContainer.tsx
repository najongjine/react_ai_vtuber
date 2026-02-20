import React, { useState, useRef, useEffect } from "react";
import Live2DViewer from "./components/Live2DViewer";
import ChatHeader from "./components/ChatHeader";
import MotionPanel from "./components/MotionPanel";
import ChatHistory from "./components/ChatHistory";
import ChatInput from "./components/ChatInput";
import { ChatMessage, Live2DController } from "./types";
import { MAO_MOTIONS, MaoMotionKey } from "./utils/constants";
import { fetchChatResponse, parseTags } from "./utils/api";
import { speak } from "./utils/tts";

const BACKEND_URL = import.meta.env.VITE_LLAMAINDEX_SERVER_URL;

const AiVtuberContainer: React.FC = () => {
    // --- State ---
    const [inputText, setInputText] = useState("");
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [sessionId] = useState(() => "user_" + Math.random().toString(36).substr(2, 9));

    // --- Refs ---
    const live2dRef = useRef<Live2DController>(null);

    // --- Effects ---
    useEffect(() => {
        const loadVoices = () => {
            window.speechSynthesis.getVoices();
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // --- Handlers ---
    const handleResetChat = () => {
        if (isStreaming) return;
        setChatHistory([]);
        setInputText("");
        setSelectedImages([]);
    };

    const handleMotionClick = (key: MaoMotionKey) => {
        live2dRef.current?.playMotion(key);
    };

    const handleExpressionClick = (id: string) => {
        live2dRef.current?.setExpression(id);
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setSelectedImages((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );
    };

    const speakText = (text: string) => {
        speak(
            text,
            () => setIsSpeaking(true),
            () => setIsSpeaking(false),
            () => setIsSpeaking(false)
        );
    };

    const processResponseTags = (text: string) => {
        const { cleanedText, tags } = parseTags(text);

        tags.forEach(rawTag => {
            console.log("Detected Tag:", rawTag);

            // 1. Direct Motion Call
            if (rawTag in MAO_MOTIONS) {
                live2dRef.current?.playMotion(rawTag as MaoMotionKey);
            }
            // 2. Unity Style Tag Mapping
            else {
                // (A) Expressions
                if (rawTag.includes("Smile") || rawTag.includes("Happy")) {
                    live2dRef.current?.setExpression("exp_02"); // Smile
                    live2dRef.current?.playMotion("SPECIAL_HEART");
                }
                else if (rawTag.includes("Angry") || rawTag.includes("Sad")) {
                    live2dRef.current?.setExpression("exp_03"); // Closed Eyes (Sad/Troubled)
                    live2dRef.current?.playMotion("TAP_BODY_3"); // Panic/Reject
                }
                else if (rawTag.includes("Default") || rawTag.includes("Normal")) {
                    live2dRef.current?.setExpression("exp_01"); // Default
                }

                // (B) Actions
                if (rawTag.includes("Jump")) {
                    live2dRef.current?.playMotion("SPECIAL_RABBIT_MAGIC");
                }
                else if (rawTag.includes("Win") || rawTag.includes("Love")) {
                    live2dRef.current?.playMotion("SPECIAL_HEART");
                }
                else if (rawTag.includes("Damage") || rawTag.includes("Shock")) {
                    live2dRef.current?.playMotion("TAP_BODY_3");
                }
                else if (rawTag.includes("Hello") || rawTag.includes("Greetings")) {
                    live2dRef.current?.playMotion("TAP_BODY_1");
                }
            }
        });

        return cleanedText;
    };

    const handleSendMessage = async () => {
        if ((!inputText.trim() && selectedImages.length === 0) || isStreaming)
            return;

        setIsStreaming(true);

        const prompt = inputText;
        const imagesToSend = [...selectedImages];
        const imageUrls = imagesToSend.map((file) => URL.createObjectURL(file));

        // 1. Add User Message
        setChatHistory((prev) => [
            ...prev,
            { role: "user", text: prompt, images: imageUrls },
        ]);

        setInputText("");
        setSelectedImages([]);

        // Question Motion
        live2dRef.current?.playMotion("TAP_BODY_1");

        // 2. Add Placeholder AI Message
        setChatHistory((prev) => [...prev, { role: "ai", text: "..." }]);

        try {
            const response = await fetchChatResponse(BACKEND_URL, prompt, sessionId, imagesToSend);

            const reader = response.body!.getReader();
            const decoder = new TextDecoder("utf-8");

            let fullResponseText = "";
            let currentSentence = "";
            let isFirstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkText = decoder.decode(value, { stream: true });

                // Remove placeholder "..." on first chunk
                if (isFirstChunk) {
                    fullResponseText = "";
                    isFirstChunk = false;
                }

                // Tag Processing
                // Note: This simple chunk-based processing assumes tags don't get split across chunks.
                // For production robustness, a buffer approach would be better, but keeping it simple as per original logic.
                const cleanChunk = processResponseTags(chunkText);

                fullResponseText += cleanChunk;
                currentSentence += cleanChunk;

                // 3. Update UI
                setChatHistory((prev) => {
                    const newHistory = [...prev];
                    const lastIndex = newHistory.length - 1;
                    if (newHistory[lastIndex].role === "ai") {
                        newHistory[lastIndex] = {
                            ...newHistory[lastIndex],
                            text: fullResponseText,
                        };
                    }
                    return newHistory;
                });

                // 4. TTS (Sentence Splitting)
                if (/[.!?\n]/.test(cleanChunk)) {
                    speakText(currentSentence);
                    currentSentence = "";
                }
            }

            // Speak remaining text
            if (currentSentence.trim()) {
                speakText(currentSentence);
            }

        } catch (error: any) {
            console.error("Backend API Error:", error);
            setChatHistory((prev) => [
                ...prev,
                {
                    role: "ai",
                    text: `오류가 발생했습니다: ${error.message || "서버 연결 실패"}`,
                },
            ]);
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100vh",
                overflow: "hidden",
            }}
        >
            <ChatHeader onReset={handleResetChat} isStreaming={isStreaming} />

            <Live2DViewer ref={live2dRef} isSpeaking={isSpeaking} />

            {/* Right Side Panel */}
            <div
                style={{
                    position: "fixed",
                    top: "80px",
                    right: "4px",
                    bottom: "160px",
                    width: "360px",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(5px)",
                    borderRadius: "20px",
                    border: "2px solid #333",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    zIndex: 40,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                <MotionPanel
                    onMotionClick={handleMotionClick}
                    onExpressionClick={handleExpressionClick}
                />
                <ChatHistory chatHistory={chatHistory} />
            </div>

            <ChatInput
                inputText={inputText}
                setInputText={setInputText}
                onSend={handleSendMessage}
                isStreaming={isStreaming}
                selectedImages={selectedImages}
                onFileChange={(files) => setSelectedImages(prev => [...prev, ...files])}
                onRemoveImage={handleRemoveImage}
            />
        </div>
    );
};

export default AiVtuberContainer;
