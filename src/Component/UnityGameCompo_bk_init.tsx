import React from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

// 스타일 정의 (전체 화면으로 꽉 채우기 예시)
const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#231F20", // 배경색
};

const canvasStyle: React.CSSProperties = {
  width: "960px", // 유니티 빌드 해상도에 맞게 조절 (또는 100%)
  height: "600px",
};

const UnityGameCompo: React.FC = () => {
  // 1. 유니티 컨텍스트 설정
  // 파일 경로는 public 폴더 기준 절대 경로("/")로 시작합니다.
  // 실제 파일명을 확인해서 'Build' 부분을 본인의 파일명으로 변경하세요.
  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
      loaderUrl: "/unity/WebglBuild.loader.js", // 예: unitychan.loader.js
      dataUrl: "/unity/WebglBuild.data", // 예: unitychan.data
      frameworkUrl: "/unity/WebglBuild.framework.js", // 예: unitychan.framework.js
      codeUrl: "/unity/WebglBuild.wasm", // 예: unitychan.wasm
    });

  const OnBodyAnim = (param: string) => {
    if (!isLoaded) return;

    // 사용법: sendMessage("오브젝트이름", "함수이름", "파라미터");
    // 아까 유니티에서 만든 오브젝트 이름과 함수 이름을 정확히 적어야 합니다.
    sendMessage("unitychan_dynamic", "OnBodyAnim", param);
  };
  const OnFaceAnim = (param: string) => {
    if (!isLoaded) return;

    // 사용법: sendMessage("오브젝트이름", "함수이름", "파라미터");
    // 아까 유니티에서 만든 오브젝트 이름과 함수 이름을 정확히 적어야 합니다.
    sendMessage("unitychan_dynamic", "OnFaceAnim", param);
  };
  const OnTalk = (param: string = "false") => {
    if (!isLoaded) return;

    // 사용법: sendMessage("오브젝트이름", "함수이름", "파라미터");
    // 아까 유니티에서 만든 오브젝트 이름과 함수 이름을 정확히 적어야 합니다.
    sendMessage("unitychan_dynamic", "OnTalk", param);
  };

  return (
    <div style={containerStyle}>
      {/* 로딩 중일 때 표시할 UI (선택사항) */}
      {!isLoaded && (
        <div style={{ position: "absolute", color: "white" }}>
          Loading... {Math.round(loadingProgression * 100)}%
        </div>
      )}

      {/* 유니티 캔버스 */}
      <Unity
        unityProvider={unityProvider}
        style={canvasStyle}
        devicePixelRatio={window.devicePixelRatio}
      />

      <div>
        <div>
          {/* 얼굴 애니메이션 list */}
          OnFaceAnim: FaceDefault, FaceSmile1, FaceSmile2, FaceAngry1,
          FaceAngry2, FaceSap, FaceConf, FaceEyeClosed, FaceDistract,
          FaceAshamed,
        </div>
        <div>
          {/* body 애니메이션 list */}
          OnBodyAnim: DoDamage0, DoDamage1, DoLose, DoReflesh, DoJump
        </div>
      </div>

      {/* React 버튼으로 유니티 조조작하기 */}
      <div
        style={{
          position: "absolute",
          bottom: "50px",
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={() => OnBodyAnim("DoDamage1")}
          style={{ padding: "10px 20px", fontSize: "20px" }}
        >
          DoDamage0_OnBodyAnim
        </button>
        <button
          onClick={() => OnBodyAnim("DoLose")}
          style={{ padding: "10px 20px", fontSize: "20px" }}
        >
          DoLose_OnBodyAnim
        </button>
        <button
          onClick={() => OnBodyAnim("DoReflesh")}
          style={{ padding: "10px 20px", fontSize: "20px" }}
        >
          DoReflesh_OnBodyAnim
        </button>
        <button
          onClick={() => OnBodyAnim("DoJump")}
          style={{ padding: "10px 20px", fontSize: "20px" }}
        >
          DoJump_OnBodyAnim
        </button>
      </div>
    </div>
  );
};

export default UnityGameCompo;
