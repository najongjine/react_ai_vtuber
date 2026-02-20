import React, { useEffect, useRef } from "react";
import { ChatMessage } from "../types";

interface ChatHistoryProps {
    chatHistory: ChatMessage[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ chatHistory }) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    return (
        <div
            ref={chatContainerRef}
            style={{
                flex: 1,
                overflowY: "auto",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
            }}
        >
            {chatHistory.length === 0 ? (
                <div style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>
                    대화를 시작해보세요!
                </div>
            ) : (
                chatHistory.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: "90%",
                            backgroundColor: msg.role === "user" ? "#4A90E2" : "#FFF",
                            color: msg.role === "user" ? "white" : "black",
                            borderRadius: "15px",
                            borderTopRightRadius: msg.role === "user" ? "2px" : "15px",
                            borderTopLeftRadius: msg.role === "ai" ? "2px" : "15px",
                            padding: "10px 14px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                            wordBreak: "break-word",
                            lineHeight: "1.5",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {/* User Image Previews */}
                        {msg.images && msg.images.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    gap: "5px",
                                    marginBottom: "5px",
                                    flexWrap: "wrap",
                                }}
                            >
                                {msg.images.map((imgUrl, i) => (
                                    <img
                                        key={i}
                                        src={imgUrl}
                                        alt="attachment"
                                        style={{
                                            width: "50px",
                                            height: "50px",
                                            objectFit: "cover",
                                            borderRadius: "5px",
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* AI Name Label */}
                        {msg.role === "ai" && (
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "#4A90E2",
                                    marginBottom: "4px",
                                    fontWeight: "bold",
                                }}
                            >
                                AI Vtuber
                            </div>
                        )}

                        {msg.text}
                    </div>
                ))
            )}
        </div>
    );
};

export default ChatHistory;
