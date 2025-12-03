import React, { useState, useRef, useEffect } from "react";
import Live2DViewerCompo from "../Component/Live2DViewerCompo"; // 경로 확인 필요
import { GoogleGenerativeAI } from "@google/generative-ai";

// API 키 설정 (실제 배포 시에는 .env 파일 사용 권장: import.meta.env.VITE_GEMINI_API_KEY)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const AiVtuber: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  // [추가] AI 응답 관련 상태
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // [기존] 화면 공유 스트림 상태
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (화면 공유 관련 코드는 기존과 동일하므로 생략하지 않고 그대로 유지) ...
  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setScreenStream(stream);
      stream.getTracks().forEach((track) => {
        track.onended = () => setScreenStream(null);
      });
    } catch (err) {
      console.error("화면 공유 실패:", err);
    }
  };

  const handleStopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
  };

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // [추가] 파일을 Gemini가 이해할 수 있는 포맷(Base64)으로 변환하는 헬퍼 함수
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

  // [수정] 메시지 전송 및 스트리밍 핸들러
  const handleSendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || isStreaming)
      return;

    // 1. UI 초기화
    setAiResponse(""); // 이전 대화 지우기 (원하면 누적하도록 수정 가능)
    setIsStreaming(true);

    // 전송할 텍스트와 이미지 백업 (입력창 비우기 전)
    const prompt = inputText;
    const imagesToSend = [...selectedImages];

    // 입력창 비우기
    setInputText("");
    setSelectedImages([]);

    try {
      // 2. 모델 준비 (gemini-1.5-flash 가 속도와 가성비가 좋음)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 3. 이미지 데이터 변환
      const imageParts = await Promise.all(
        imagesToSend.map((file) => fileToGenerativePart(file))
      );

      // 4. 스트리밍 요청 (텍스트 + 이미지)
      // 화면 공유 중이라면 스크린샷 로직도 여기에 추가 가능
      const result = await model.generateContentStream([prompt, ...imageParts]);

      // 5. 스트림 청크(조각) 처리
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        // 기존 텍스트에 이어 붙여서 타자기 효과처럼 보이게 함
        setAiResponse((prev) => prev + chunkText);
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      setAiResponse("에러가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...filesArray]);
    }
  };

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
      {/* ... (헤더 부분 기존과 동일) ... */}
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
        {!screenStream ? (
          <button
            onClick={handleStartScreenShare}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              borderRadius: "8px",
              border: "none",
              background: "#4A90E2",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            🖥️ 화면 공유 시작
          </button>
        ) : (
          <button
            onClick={handleStopScreenShare}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              borderRadius: "8px",
              border: "none",
              background: "#ff5555",
              color: "white",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            ⏹️ 공유 중지
          </button>
        )}
      </div>

      <Live2DViewerCompo />

      {/* 화면 공유 영역 (기존 코드) */}
      {screenStream && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-10%, -60%)",
            width: "60vw",
            maxWidth: "800px",
            aspectRatio: "16/9",
            backgroundColor: "#000",
            borderRadius: "12px",
            border: "8px solid #333",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            AI Watching...
          </div>
        </div>
      )}

      {/* [추가] AI 응답 말풍선 (캐릭터 옆에 표시) */}
      {aiResponse && (
        <div
          style={{
            position: "absolute",
            bottom: "200px", // 캐릭터 머리 위나 옆 적절한 위치
            left: "10%", // Live2D 모델 위치 근처
            width: "300px",
            padding: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "20px",
            borderBottomLeftRadius: "0", // 말풍선 꼬리 느낌
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            zIndex: 40,
            whiteSpace: "pre-wrap", // 줄바꿈 적용
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

      {/* 채팅 입력 컨테이너 (기존 디자인 유지 + 로딩 상태 처리) */}
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
        {/* 이미지 미리보기 */}
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

        {/* 입력 컨트롤 */}
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
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming ? "AI가 답변 중입니다..." : "메시지를 입력하세요..."
            }
            rows={1}
            disabled={isStreaming} // 스트리밍 중 입력 방지
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
            disabled={isStreaming} // 스트리밍 중 버튼 비활성화
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
