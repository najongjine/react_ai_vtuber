import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

// 1. 전체 컨테이너: 이제 화면 전체가 아니라, 이 컴포넌트가 들어갈 '영역'만큼만 차지합니다.
const containerStyle: React.CSSProperties = {
  position: "relative", // ★ 수정: 부모 요소 기준으로 배치
  width: "100%", // ★ 수정: 부모 너비 꽉 채움
  height: "100%", // ★ 수정: 부모 높이 꽉 채움 (부모 높이가 지정되어 있어야 함)
  overflow: "hidden", // 튀어나가는 것 방지
  backgroundColor: "#231F20",
};

// 2. 유니티 캔버스: 컨테이너 크기에 맞춰 꽉 채움
const canvasStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// 3. UI 오버레이: 유니티 화면(container) 위를 덮음
const uiOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  pointerEvents: "none", // ★ 중요: 배경 클릭 통과
  padding: "20px",
  boxSizing: "border-box",
};

const interactiveElementStyle: React.CSSProperties = {
  pointerEvents: "auto", // 버튼 등은 클릭 가능하게
};

const UnityGameCompo: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
      loaderUrl: "/unity/WebglBuild.loader.js",
      dataUrl: "/unity/WebglBuild.data",
      frameworkUrl: "/unity/WebglBuild.framework.js",
      codeUrl: "/unity/WebglBuild.wasm",
    });

  const handleAnim = (funcName: string, param: string) => {
    if (!isLoaded) return;
    sendMessage("unitychan_dynamic", funcName, param);
  };

  return (
    <div style={containerStyle}>
      {/* --- Layer 1: Unity (Background) --- */}
      <Unity
        unityProvider={unityProvider}
        style={canvasStyle}
        devicePixelRatio={window.devicePixelRatio}
      />

      {/* 로딩 인디케이터 */}
      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            zIndex: 20,
          }}
        >
          Loading Unity... {Math.round(loadingProgression * 100)}%
        </div>
      )}

      {/* --- Layer 2: UI Overlay (Foreground) --- */}
      <div style={uiOverlayStyle}>
        {/* 상단 상태창 */}
        <div
          style={{
            ...interactiveElementStyle,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: "10px",
            borderRadius: "8px",
            maxWidth: "300px",
          }}
        >
          <h3>AI Vtuber Status</h3>
          <p>현재 상태: 대기중</p>
        </div>

        {/* 하단 채팅 및 버튼 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              ...interactiveElementStyle,
              width: "100%", // 채팅창 너비 조정
              maxWidth: "400px",
              height: "200px",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: "10px",
              padding: "10px",
              overflowY: "auto",
              marginBottom: "10px",
            }}
          >
            <div style={{ fontWeight: "bold" }}>User: 안녕?</div>
            <div style={{ color: "blue" }}>
              Vtuber: 안녕하세요! 무엇을 도와드릴까요?
            </div>
          </div>

          <div
            style={{ ...interactiveElementStyle, display: "flex", gap: "10px" }}
          >
            <button
              onClick={() => handleAnim("OnBodyAnim", "DoDamage1")}
              style={{ padding: "10px" }}
            >
              피격 모션
            </button>
            <button
              onClick={() => handleAnim("OnBodyAnim", "DoJump")}
              style={{ padding: "10px" }}
            >
              점프
            </button>
            <button
              onClick={() => handleAnim("OnFaceAnim", "FaceSmile1")}
              style={{ padding: "10px" }}
            >
              웃기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnityGameCompo;
