import React, { useState, useRef, useEffect } from "react";
import Live2DViewerCompo from "../Component/Live2DViewerCompo"; // 경로에 맞게 수정해주세요

const AiVtuber: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  // [추가] 화면 공유 스트림 상태 관리
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // [추가] 화면 공유 시작 핸들러
  const handleStartScreenShare = async () => {
    try {
      // 브라우저의 화면 공유 권한 요청
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // 시스템 오디오 공유 여부
      });

      setScreenStream(stream);

      // 사용자가 브라우저 UI에서 '공유 중지'를 눌렀을 때 처리
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setScreenStream(null);
        };
      });
    } catch (err) {
      console.error("화면 공유 실패 또는 취소:", err);
    }
  };

  // [추가] 화면 공유 중지 핸들러
  const handleStopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
  };

  // [추가] 스트림이 변경되면 비디오 태그에 연결
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (!inputText.trim() && selectedImages.length === 0) return;

    console.log("보낼 텍스트:", inputText);
    console.log("보낼 이미지들:", selectedImages);

    // 만약 화면 공유 중이라면, 현재 화면의 스크린샷을 찍어서 AI에게 보낼 수도 있습니다. (추후 구현)
    if (screenStream) {
      console.log("현재 화면 공유 중입니다. (이미지 캡처 로직 필요 시 추가)");
    }

    // 전송 후 초기화
    setInputText("");
    setSelectedImages([]);
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
      {/* 1. 헤더 & 컨트롤 */}
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

        {/* 화면 공유 토글 버튼 */}
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

      {/* 2. 배경: Live2D 뷰어 */}
      <Live2DViewerCompo />

      {/* [추가] 3. 공유된 화면 (가상 모니터) */}
      {screenStream && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-10%, -60%)", // Live2D 모델(왼쪽)을 가리지 않게 살짝 오른쪽 위로 배치
            width: "60vw",
            maxWidth: "800px",
            aspectRatio: "16/9",
            backgroundColor: "#000",
            borderRadius: "12px",
            border: "8px solid #333",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 10, // Live2D보다는 앞에, 채팅창보다는 뒤에 올 수도 있음
            overflow: "hidden",
          }}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted // 내 컴퓨터 소리가 다시 나에게 들리지 않도록 음소거 (AI에게 전송할 때는 영향 없음)
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
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

      {/* 4. 채팅 입력 컨테이너 */}
      <div
        style={{
          position: "fixed",
          bottom: "50px",
          left: "58%", // Live2D 모델 위치 고려해서 중앙보다 약간 오른쪽
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
        {/* (1) 이미지 미리보기 */}
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

        {/* (2) 입력 컨트롤 */}
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
            placeholder="메시지를 입력하세요..."
            rows={1}
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
            }}
          />

          <button
            onClick={handleSendMessage}
            style={{
              height: "46px",
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
