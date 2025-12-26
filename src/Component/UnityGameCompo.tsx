import React, { useState, useEffect, useRef } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

// 타입 정의: 대화 메시지 구조
interface ChatMessage {
  id: number;
  sender: "User" | "Vtuber" | "System";
  text: string;
}

// 1. 전체 컨테이너
const containerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "#231F20",
};

// 2. 유니티 캔버스
const canvasStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// 3. UI 오버레이 (전체 레이아웃)
const uiOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 10,
  display: "flex",
  flexDirection: "column", // 상 - 중 - 하 배치
  pointerEvents: "none",
  padding: "20px",
  boxSizing: "border-box",
};

// [상단] 상태바 영역
const topSectionStyle: React.CSSProperties = {
  height: "50px", // 높이 고정
  display: "flex",
  alignItems: "center",
  pointerEvents: "auto",
};

// [중단] 메인 영역 (여기에 채팅창을 우측으로 보냄)
const middleSectionStyle: React.CSSProperties = {
  flex: 1, // 남은 공간 다 차지
  display: "flex",
  justifyContent: "flex-end", // ★ 핵심: 내용물을 오른쪽 끝으로 정렬
  alignItems: "center", // 수직 가운데 정렬
  paddingRight: "20px", // 오른쪽 여백
  pointerEvents: "none", // 빈 공간 클릭 시 뒤쪽 유니티 터치 가능
};

// 채팅 로그 스타일 (우측 배치용)
const chatWindowStyle: React.CSSProperties = {
  width: "350px", // 너비 고정 (PC 메신저 느낌)
  height: "60vh", // 화면 높이의 60% 차지
  backgroundColor: "rgba(0, 0, 0, 0.5)", // 더 투명하게 (배경 보이게)
  color: "white",
  borderRadius: "15px",
  padding: "15px",
  overflowY: "auto",
  pointerEvents: "auto", // 여기는 클릭/스크롤 가능해야 함
  backdropFilter: "blur(5px)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)", // 그림자 추가
};

// [하단] 입력 및 컨트롤 영역
const bottomSectionStyle: React.CSSProperties = {
  height: "80px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  pointerEvents: "auto",
};

// 컨트롤 바
const controlBarStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  width: "100%",
  maxWidth: "800px", // 너무 넓어지지 않게 제한
  padding: "10px",
  backgroundColor: "rgba(20, 20, 20, 0.8)",
  borderRadius: "30px", // 둥글게
  backdropFilter: "blur(10px)",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "20px",
  backgroundColor: "#4CAF50",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  whiteSpace: "nowrap",
  transition: "transform 0.1s",
};

const UnityGameCompo: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
      loaderUrl: "/unity/WebglBuild.loader.js",
      dataUrl: "/unity/WebglBuild.data",
      frameworkUrl: "/unity/WebglBuild.framework.js",
      codeUrl: "/unity/WebglBuild.wasm",
    });

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "System", text: "AI Vtuber 시스템에 접속했습니다." },
    {
      id: 2,
      sender: "Vtuber",
      text: "안녕하세요! (웃음) 화면 설정이 바뀌었나요?",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAnim = (funcName: string, param: string) => {
    if (!isLoaded) return;
    sendMessage("unitychan_dynamic", funcName, param);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: "User",
      text: input,
    };
    setMessages((prev) => [...prev, userMsg]);

    const currentUserInput = input;
    setInput("");

    // AI 응답 시뮬레이션
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: "Vtuber",
        text: `"${currentUserInput}"... 흐음, 그렇군요!`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div style={containerStyle}>
      <Unity
        unityProvider={unityProvider}
        style={canvasStyle}
        devicePixelRatio={window.devicePixelRatio}
      />

      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            zIndex: 20,
            fontSize: "20px",
          }}
        >
          Loading... {Math.round(loadingProgression * 100)}%
        </div>
      )}

      <div style={uiOverlayStyle}>
        {/* [상단] 상태 표시 */}
        <div style={topSectionStyle}>
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              padding: "8px 16px",
              borderRadius: "20px",
              color: "white",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ color: "#00ff00", fontSize: "10px" }}>●</span>
            <span>LIVE</span>
          </div>
        </div>

        {/* [중단] 우측 채팅창 배치 */}
        <div style={middleSectionStyle}>
          <div style={chatWindowStyle}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === "User" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor:
                    msg.sender === "User"
                      ? "rgba(100, 100, 255, 0.6)"
                      : "rgba(255, 255, 255, 0.1)",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  borderBottomRightRadius:
                    msg.sender === "User" ? "2px" : "12px",
                  borderTopLeftRadius: msg.sender === "Vtuber" ? "2px" : "12px",
                  fontSize: "14px",
                  lineHeight: "1.4",
                }}
              >
                {msg.sender === "Vtuber" && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#FFD700",
                      marginBottom: "4px",
                    }}
                  >
                    Vtuber
                  </div>
                )}
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* [하단] 컨트롤바 */}
        <div style={bottomSectionStyle}>
          <div style={controlBarStyle}>
            <button
              style={buttonStyle}
              onClick={() => handleAnim("OnFaceAnim", "FaceSmile1")}
            >
              😊
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
              onClick={() => handleAnim("OnBodyAnim", "DoJump")}
            >
              ⏫
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: "#F44336" }}
              onClick={() => handleAnim("OnBodyAnim", "DoDamage1")}
            >
              💥
            </button>

            <input
              type="text"
              placeholder="대화하기..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "20px",
                border: "none",
                outline: "none",
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
            />
            <button
              style={{ ...buttonStyle, backgroundColor: "#673AB7" }}
              onClick={handleSendMessage}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnityGameCompo;
