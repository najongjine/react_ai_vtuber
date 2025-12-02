import React, { useState, useRef } from "react";
import Live2DViewerCompo from "../Component/Live2DViewerCompo";

const AiVtuber: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // 이미지 파일 상태
  const fileInputRef = useRef<HTMLInputElement>(null); // 파일 인풋 제어용

  // 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (!inputText.trim() && selectedImages.length === 0) return;

    console.log("보낼 텍스트:", inputText);
    console.log("보낼 이미지들:", selectedImages);

    // TODO: 여기에 실제 AI 서버로 데이터(텍스트+이미지) 전송하는 로직 추가

    // 전송 후 초기화
    setInputText("");
    setSelectedImages([]);
  };

  // 키보드 엔터 처리 (Shift + Enter는 줄바꿈, 그냥 Enter는 전송)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 중복 입력 방지

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 줄바꿈 방지
      handleSendMessage();
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages((prev) => [...prev, ...filesArray]); // 기존 이미지에 추가
    }
  };

  // 선택한 이미지 삭제 핸들러
  const removeImage = (indexToRemove: number) => {
    setSelectedImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* 1. 헤더 */}
      <div style={{ textAlign: "center", paddingTop: "20px" }}>
        <h1>AI Vtuber</h1>
      </div>

      {/* 2. 배경: Live2D 뷰어 */}
      <Live2DViewerCompo />

      {/* 3. 채팅 입력 컨테이너 */}
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
          flexDirection: "column", // 세로 정렬 (미리보기 - 입력창 순)
          gap: "10px",
        }}
      >
        {/* (1) 이미지 미리보기 영역 (이미지가 있을 때만 표시) */}
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
                {/* 삭제 버튼 (X) */}
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

        {/* (2) 입력 컨트롤 영역 (파일버튼 + 텍스트창 + 전송버튼) */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
          {/* 파일 첨부 버튼 (클립 아이콘) */}
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }} // 실제 인풋은 숨김
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

          {/* 멀티라인 텍스트 입력 (Textarea) */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요 (Shift+Enter 줄바꿈)"
            rows={1}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "16px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              outline: "none",
              resize: "none", // 사용자 임의 크기 조절 방지
              minHeight: "46px", // 기본 높이
              maxHeight: "150px", // 너무 길어지면 스크롤
              fontFamily: "inherit",
              overflowY: "auto",
            }}
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSendMessage}
            style={{
              height: "46px", // 텍스트창 높이와 맞춤
              padding: "0 20px",
              fontSize: "16px",
              fontWeight: "bold",
              color: "white",
              backgroundColor: "#4A90E2",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiVtuber;
