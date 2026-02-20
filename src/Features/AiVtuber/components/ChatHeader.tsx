import React from "react";

interface ChatHeaderProps {
    onReset: () => void;
    isStreaming: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ onReset, isStreaming }) => {
    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                padding: "20px",
                textAlign: "center",
                zIndex: 50,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
            }}
        >
            <h1 style={{ margin: 0, textShadow: "0 2px 4px rgba(255,255,255,0.8)" }}>
                AI Vtuber (LlamaIndex)
            </h1>
            <button
                onClick={onReset}
                disabled={isStreaming}
                style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    borderRadius: "8px",
                    border: "none",
                    background: isStreaming ? "#aaa" : "#50E3C2",
                    color: "white",
                    cursor: isStreaming ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                }}
            >
                🔄 대화 초기화
            </button>
        </div>
    );
};

export default ChatHeader;
