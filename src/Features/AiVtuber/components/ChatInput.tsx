import React, { useRef } from "react";

interface ChatInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    onSend: () => void;
    isStreaming: boolean;
    selectedImages: File[];
    onFileChange: (files: File[]) => void;
    onRemoveImage: (index: number) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    inputText,
    setInputText,
    onSend,
    isStreaming,
    selectedImages,
    onFileChange,
    onRemoveImage,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        const imageFiles: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault();
            onFileChange(imageFiles);
        }
    };

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            onFileChange(filesArray);
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                bottom: "40px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "600px",
                maxWidth: "90%",
                padding: "15px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "15px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
            }}
        >
            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        overflowX: "auto",
                        paddingBottom: "5px",
                    }}
                >
                    {selectedImages.map((file, index) => (
                        <div key={index} style={{ position: "relative", flexShrink: 0 }}>
                            <img
                                src={URL.createObjectURL(file)}
                                alt="preview"
                                style={{
                                    width: "60px",
                                    height: "60px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                }}
                            />
                            <button
                                onClick={() => onRemoveImage(index)}
                                style={{
                                    position: "absolute",
                                    top: "-5px",
                                    right: "-5px",
                                    background: "red",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "20px",
                                    height: "20px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Controls */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={onFileInputChange}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "24px",
                        padding: "5px",
                        color: "#555",
                    }}
                    title="이미지 첨부"
                >
                    📎
                </button>

                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isStreaming ? "AI가 답변 중입니다..." : "메시지를 입력하세요..."
                    }
                    rows={1}
                    disabled={isStreaming}
                    style={{
                        flex: 1,
                        padding: "12px",
                        fontSize: "16px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        outline: "none",
                        resize: "none",
                        minHeight: "46px",
                        maxHeight: "150px",
                        fontFamily: "inherit",
                        overflowY: "auto",
                        backgroundColor: isStreaming ? "#f5f5f5" : "white",
                    }}
                />

                <button
                    onClick={onSend}
                    disabled={isStreaming}
                    style={{
                        height: "46px",
                        padding: "0 20px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "white",
                        backgroundColor: isStreaming ? "#ccc" : "#4A90E2",
                        border: "none",
                        borderRadius: "10px",
                        cursor: isStreaming ? "not-allowed" : "pointer",
                        transition: "background 0.2s",
                    }}
                >
                    {isStreaming ? "..." : "전송"}
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
