import React, { useState, useRef, useEffect } from "react";
import Live2DViewerCompo from "../Component/Live2DViewerCompo";
import { MAO_MOTIONS, Live2DController } from "../Component/Live2DMaoConstants";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

// 환경변수에서 API 키 가져오기
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const AiVtuber: React.FC = () => {
  // --- 상태 관리 (채팅, 이미지, 응답, 스트리밍, 말하기) ---
  const [inputText, setInputText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- Refs ---
  const chatSessionRef = useRef<ChatSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const live2dRef = useRef<Live2DController>(null);

  // --- 음성 목록 로드 (크롬 등 브라우저 호환성) ---
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // --- 헬퍼 함수: 이미지 파일을 Gemini용 포맷으로 변환 ---
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  };

  // --- 채팅 초기화 ---
  const handleResetChat = () => {
    if (isStreaming) return;
    chatSessionRef.current = null;
    setAiResponse("");
    setInputText("");
    setSelectedImages([]);
  };

  // --- Live2D 모션 재생 함수 ---
  const triggerMotion = (motionKey: keyof typeof MAO_MOTIONS) => {
    if (live2dRef.current) {
      live2dRef.current.playMotion(motionKey);
    }
  };

  // --- TTS (말하기) 함수 ---
  const speak = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const korVoice = voices.find(
        (v) => v.lang === "ko-KR" && v.name.includes("Google")
      );
      if (korVoice) utterance.voice = korVoice;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // --- 메시지 전송 및 Gemini 호출 ---
  const handleSendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || isStreaming)
      return;

    setAiResponse("");
    setIsStreaming(true);

    const prompt = inputText;
    const imagesToSend = [...selectedImages];

    setInputText("");
    setSelectedImages([]);

    // 질문 보낼 때 모션 (고민하는 듯한 제스처 등)
    triggerMotion("TAP_BODY_1");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      if (!chatSessionRef.current) {
        chatSessionRef.current = model.startChat({
          history: [],
        });
      }

      const imageParts = await Promise.all(
        imagesToSend.map((file) => fileToGenerativePart(file))
      );

      const result = await chatSessionRef.current.sendMessageStream([
        prompt,
        ...imageParts,
      ]);

      let currentSentence = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        setAiResponse((prev) => prev + chunkText);
        currentSentence += chunkText;

        // 문장 단위로 끊어서 읽기 (. ! ? 줄바꿈)
        if (/[.!?\n]/.test(chunkText)) {
          speak(currentSentence);
          currentSentence = "";
        }
      }

      if (currentSentence.trim()) {
        speak(currentSentence);
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      setAiResponse("에러가 발생했습니다. (채팅 세션 초기화)");
      chatSessionRef.current = null;
    } finally {
      setIsStreaming(false);
    }
  };

  /**  --- 붙여넣기(Ctrl+V) 처리: 스크린샷 이미지 감지 --- */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // 붙여넣은 데이터가 이미지인 경우
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    // 이미지가 발견되면 상태에 추가하고, 텍스트가 섞여 들어가는 것 방지(선택사항)
    if (imageFiles.length > 0) {
      e.preventDefault(); // 이미지를 붙여넣었을 때 불필요한 텍스트 입력 방지
      setSelectedImages((prev) => [...prev, ...imageFiles]);
    }
  };

  // --- 엔터키 입력 처리 ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- 파일 선택 처리 ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...filesArray]);
    }
  };

  // --- 선택된 이미지 삭제 ---
  const removeImage = (indexToRemove: number) => {
    setSelectedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
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
      {/* --- 상단 헤더 (제목 & 초기화 버튼) --- */}
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
        <h1
          style={{ margin: 0, textShadow: "0 2px 4px rgba(255,255,255,0.8)" }}
        >
          AI Vtuber
        </h1>

        <button
          onClick={handleResetChat}
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
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          🔄 대화 초기화
        </button>
      </div>

      {/* --- Live2D 뷰어 컴포넌트 --- */}
      <Live2DViewerCompo ref={live2dRef} isSpeaking={isSpeaking} />

      {/* --- 모션 테스트 버튼들 (우측 상단) --- */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 20,
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button onClick={() => triggerMotion("SPECIAL_HEART")}>
          ❤️ 하트 발사
        </button>
        <button onClick={() => triggerMotion("SPECIAL_RABBIT_MAGIC")}>
          🐰 토끼 마술
        </button>
        <button onClick={() => triggerMotion("TAP_BODY_3")}>👋 인사</button>
      </div>

      {/* --- AI 응답 말풍선 --- */}
      {aiResponse && (
        <div
          style={{
            position: "absolute",
            bottom: "200px",
            left: "10%",
            width: "300px",
            padding: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "20px",
            borderBottomLeftRadius: "0",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            zIndex: 40,
            whiteSpace: "pre-wrap",
            fontSize: "16px",
            lineHeight: "1.5",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              color: "#4A90E2",
              display: "block",
              marginBottom: "5px",
            }}
          >
            AI Vtuber
          </span>
          {aiResponse}
        </div>
      )}

      {/* --- 하단 입력창 영역 --- */}
      <div
        style={{
          position: "fixed",
          bottom: "50px",
          left: "58%",
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
        {/* 선택된 이미지 미리보기 */}
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
                  onClick={() => removeImage(index)}
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

        {/* 입력 컨트롤 (파일첨부 + 텍스트 + 전송버튼) */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
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
            onClick={handleSendMessage}
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
    </div>
  );
};

export default AiVtuber;
