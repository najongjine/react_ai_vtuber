import React, { useState, useEffect, useRef } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";

// 타입 정의: 대화 메시지 구조
interface ChatMessage {
  id: number;
  sender: "User" | "Vtuber" | "System";
  text: string;
  attachments?: { url: string; type: string; name: string }[]; // 모든 파일 지원
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

// 3. UI 오버레이
const uiOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  pointerEvents: "none",
  padding: "20px",
  boxSizing: "border-box",
};

const topSectionStyle: React.CSSProperties = {
  height: "50px",
  display: "flex",
  alignItems: "center",
  pointerEvents: "auto",
};

const middleSectionStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  paddingRight: "20px",
  pointerEvents: "none",
};

const chatWindowStyle: React.CSSProperties = {
  width: "350px",
  height: "60vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: "white",
  borderRadius: "15px",
  padding: "15px",
  overflowY: "auto",
  pointerEvents: "auto",
  backdropFilter: "blur(5px)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
};

const bottomSectionStyle: React.CSSProperties = {
  height: "auto", // 이미지 미리보기 때문에 높이 유동적으로 변경
  minHeight: "80px",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end", // 바닥에 붙도록
  paddingBottom: "10px",
  pointerEvents: "auto",
};

const controlBarStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column", // 미리보기 영역을 위해 세로 정렬로 변경
  gap: "10px",
  width: "100%",
  maxWidth: "800px",
  padding: "10px",
  backgroundColor: "rgba(20, 20, 20, 0.8)",
  borderRadius: "30px",
  backdropFilter: "blur(10px)",
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  width: "100%",
  alignItems: "center",
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

// 이미지 미리보기 스타일
const previewContainerStyle: React.CSSProperties = {
  display: "flex",
  padding: "0 10px",
  gap: "10px",
  overflowX: "auto",
};

const previewImageWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "60px",
  height: "60px",
  borderRadius: "8px",
  overflow: "hidden",
  border: "2px solid #673AB7",
};

const previewCloseButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "0",
  right: "0",
  background: "rgba(0,0,0,0.6)",
  color: "white",
  border: "none",
  cursor: "pointer",
  width: "20px",
  height: "20px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const FACE_ANIMS = [
  "FaceDefault",
  "FaceSmile1",
  "FaceSmile2",
  "FaceAngry1",
  "FaceAngry2",
  "FaceSap",
  "FaceConf",
  "FaceEyeClosed",
  "FaceDistract",
  "FaceAshamed",
];

const BODY_ANIMS = ["DoDamage0", "DoDamage1", "DoLose", "DoReflesh", "DoJump"];
const BACKEND_URL = import.meta.env.VITE_LLAMAINDEX_SERVER_URL;

const UnityGameCompo: React.FC = () => {
  const { unityProvider, isLoaded, loadingProgression, sendMessage } =
    useUnityContext({
      loaderUrl: "/unity/WebglBuild.loader.js",
      dataUrl: "/unity/WebglBuild.data",
      frameworkUrl: "/unity/WebglBuild.framework.js",
      codeUrl: "/unity/WebglBuild.wasm",
    });

  const [input, setInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // [추가] 파일 업로드 관련 상태
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "System", text: "AI Vtuber 시스템에 접속했습니다." },
    {
      id: 2,
      sender: "Vtuber",
      text: "안녕하세요! (웃음) 화면 설정이 바뀌었나요?",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // [추가] 파일 인풋용 Ref

  const [sessionId] = useState(
    () => "user_" + Math.random().toString(36).substr(2, 9),
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 파일 선택 해제 시 메모리 해제
  useEffect(() => {
    // 실제 운영 환경에서는 언마운트 시 revoke 로직을 더 정교하게 짤 필요가 있음
    return () => {
      // 명시적 삭제(removeFile)시에만 revoke 수행함.
    };
  }, []);

  const handleAnim = (funcName: string, param: string) => {
    if (!isLoaded) return;
    sendMessage("unitychan_dynamic", funcName, param);
  };

  // -------------------------------------------------------------
  // [추가] 파일 처리 로직 (선택 및 붙여넣기 공통)
  // -------------------------------------------------------------
  const handleFileProcess = (files: File[]) => {
    const newFiles: File[] = [];
    const newUrls: string[] = [];

    Array.from(files).forEach((file) => {
      // 모든 파일 허용
      newFiles.push(file);
      newUrls.push(URL.createObjectURL(file));
    });

    setSelectedFiles((prev: File[]) => [...prev, ...newFiles]);
    setPreviewUrls((prev: string[]) => [...prev, ...newUrls]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev: File[]) =>
      prev.filter((_: File, i: number) => i !== index),
    );
    setPreviewUrls((prev: string[]) =>
      prev.filter((_: string, i: number) => i !== index),
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFiles = () => {
    // 전송 후에는 미리보기 URL을 revoke하지 않음 (채팅창에 남기기 위함)
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -------------------------------------------------------------
  // 서버 스트리밍 통신 로직
  // -------------------------------------------------------------
  const handleSendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isAiThinking) return;

    const userText = input;
    const userMsgId = Date.now();

    const attachments = selectedFiles.map((file, index) => ({
      url: previewUrls[index],
      type: file.type,
      name: file.name,
    }));

    // 1. 유저 메시지 UI 추가
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "User",
      text: userText,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const aiMsgId = userMsgId + 1;
    const aiPlaceholder: ChatMessage = {
      id: aiMsgId,
      sender: "Vtuber",
      text: "",
    };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);

    // 상태 초기화
    setInput("");
    clearFiles();
    setIsAiThinking(true);
    setIsAiThinking(true);

    // [변경 1] OnTalk(말하기 입모양) 시작 부분 제거함 (TTS 연동 위해)
    // if (isLoaded) sendMessage("unitychan_dynamic", "OnTalk", "true");

    try {
      const formData = new FormData();
      formData.append("question", userText);
      formData.append("session_id", sessionId);
      selectedFiles.forEach((file: File) => {
        formData.append("file", file);
      });

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.body) throw new Error("ReadableStream not supported.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      // [변경 2] 스트리밍 중에 발견된 태그를 모아둘 배열
      const detectedTags: string[] = [];

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const tagRegex = /\[\[(.*?)\]\]/g;
          let match;

          while ((match = tagRegex.exec(buffer)) !== null) {
            const fullTag = match[0];
            const tagName = match[1];

            // [변경 3] 즉시 실행하지 않고 리스트에 저장만 함
            detectedTags.push(tagName);

            // 텍스트에서는 태그 제거 (UI 깔끔하게)
            buffer = buffer.replace(fullTag, "");
            tagRegex.lastIndex = 0;
          }

          // 미완성 태그 처리 로직 (기존과 동일)
          const openBracketIndex = buffer.lastIndexOf("[[");
          const closeBracketIndex = buffer.lastIndexOf("]]");
          let textToDisplay = "";

          if (openBracketIndex !== -1 && openBracketIndex > closeBracketIndex) {
            textToDisplay = buffer.substring(0, openBracketIndex);
            buffer = buffer.substring(openBracketIndex);
          } else {
            textToDisplay = buffer;
            buffer = "";
          }

          if (textToDisplay) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === aiMsgId
                  ? { ...msg, text: msg.text + textToDisplay }
                  : msg,
              ),
            );
          }
        }
      }

      // ---------------------------------------------------------
      // [변경 4] 스트리밍(응답)이 완전히 끝난 후 애니메이션 실행
      // ---------------------------------------------------------
      if (isLoaded && detectedTags.length > 0) {
        // 여러 태그가 감지되었다면, 보통 문맥상 '마지막' 태그가 최종 감정일 가능성이 높음
        // 혹은 우선순위에 따라 detectedTags를 순회하며 실행해도 됨.
        // 여기서는 '가장 마지막에 나온 표정/행동'을 수행하도록 구현.

        // 1. 마지막으로 감지된 표정 찾기
        const lastFace = detectedTags
          .reverse()
          .find((tag) => FACE_ANIMS.includes(tag));

        // 2. 마지막으로 감지된 몸짓 찾기 (reverse 했으니 앞에서 찾음)
        const lastBody = detectedTags.find((tag) => BODY_ANIMS.includes(tag));

        // 몸짓 실행
        if (lastBody) {
          console.log("Play Body Anim:", lastBody);
          sendMessage("unitychan_dynamic", "OnBodyAnim", lastBody);
        }

        // 표정 실행 및 3초 뒤 리셋
        if (lastFace) {
          console.log("Play Face Anim:", lastFace);
          sendMessage("unitychan_dynamic", "OnFaceAnim", lastFace);

          // [핵심] 3초 뒤 기본 표정으로 복귀
          setTimeout(() => {
            console.log("Reset Face to Default");
            sendMessage("unitychan_dynamic", "OnFaceAnim", "FaceDefault");
          }, 5000);
        }
      }

      // 나중에 TTS 코드가 들어갈 자리
      // playTTS(fullText);
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "System", text: "오류가 발생했습니다." },
      ]);
    } finally {
      setIsAiThinking(false);
      // [변경 5] OnTalk 종료 코드 제거함 (어차피 시작을 안 했으므로)
    }
  };

  // -------------------------------------------------------------
  // [수정] 네이티브 이벤트 리스너 (키보드 + 붙여넣기)
  // -------------------------------------------------------------
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const stopPropagation = (e: Event) => {
      e.stopPropagation();
    };

    const handleNativeKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    // [추가] 붙여넣기 이벤트 처리
    const handleNativePaste = (e: ClipboardEvent) => {
      e.stopPropagation(); // 유니티 간섭 방지

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        handleFileProcess(pastedFiles);
        e.preventDefault();
      }
    };

    // 리스너 등록
    textarea.addEventListener("keydown", handleNativeKeyDown);
    textarea.addEventListener("keyup", stopPropagation);
    textarea.addEventListener("keypress", stopPropagation);
    textarea.addEventListener("paste", handleNativePaste); // 붙여넣기 리스너 추가

    return () => {
      textarea.removeEventListener("keydown", handleNativeKeyDown);
      textarea.removeEventListener("keyup", stopPropagation);
      textarea.removeEventListener("keypress", stopPropagation);
      textarea.removeEventListener("paste", handleNativePaste);
    };
  }, [input, selectedFiles, handleSendMessage]); // 의존성 배열에 selectedFiles 등 추가

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
        {/* [상단] */}
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

        {/* [중단] 채팅창 */}
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
                {/* [추가] 사용자가 보낸 이미지 표시 */}
                {/* [추가] 사용자가 보낸 파일 표시 */}
                {msg.attachments &&
                  msg.attachments.map((att, idx) => (
                    <div key={idx} style={{ marginBottom: "5px" }}>
                      {att.type.startsWith("image/") ? (
                        <img
                          src={att.url}
                          alt={`uploaded-${idx}`}
                          style={{ maxWidth: "100%", borderRadius: "8px" }}
                        />
                      ) : (
                        <div
                          style={{
                            backgroundColor: "rgba(255,255,255,0.1)",
                            padding: "10px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>📄</span>
                          <span>{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* [하단] 컨트롤바 */}
        <div style={bottomSectionStyle}>
          <div style={controlBarStyle}>
            {/* [추가] 이미지 미리보기 영역 (파일이 있을 때만 보임) */}
            {selectedFiles.length > 0 && (
              <div style={previewContainerStyle}>
                {selectedFiles.map((file, index) => (
                  <div key={index} style={previewImageWrapperStyle}>
                    {file.type.startsWith("image/") ? (
                      <img
                        src={previewUrls[index]}
                        alt={`preview-${index}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "#333",
                          color: "white",
                          flexDirection: "column",
                          fontSize: "10px",
                          textAlign: "center",
                          padding: "2px",
                        }}
                      >
                        <div style={{ fontSize: "16px", marginBottom: "2px" }}>
                          📄
                        </div>
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                          }}
                        >
                          {file.name}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      style={previewCloseButtonStyle}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#ccc",
                  }}
                >
                  {selectedFiles.length}장 첨부됨
                </div>
              </div>
            )}

            <div style={inputRowStyle}>
              {/* [추가] 숨겨진 파일 인풋 */}
              <input
                type="file"
                // accept 제거하여 모든 파일 허용
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(Array.from(e.target.files));
                  }
                }}
              />

              {/* [추가] + 버튼 */}
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#555",
                  padding: "10px 12px",
                  fontSize: "18px",
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isAiThinking}
              >
                +
              </button>

              <button
                style={{ ...buttonStyle, backgroundColor: "#2196F3" }}
                onClick={() => handleAnim("OnBodyAnim", "DoJump")}
              >
                ⏫
              </button>

              <textarea
                ref={inputRef}
                placeholder={
                  isAiThinking
                    ? "AI 처리 중..."
                    : "대화하기... (Ctrl+V로 이미지 붙여넣기 가능)"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={(e) => e.stopPropagation()}
                disabled={isAiThinking}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "20px",
                  border: "none",
                  outline: "none",
                  backgroundColor: isAiThinking
                    ? "rgba(200,200,200,0.8)"
                    : "rgba(255,255,255,0.9)",
                  resize: "none",
                  height: "40px",
                  overflow: "hidden",
                  lineHeight: "1.5",
                  fontFamily: "inherit",
                }}
              />
              <button
                style={{ ...buttonStyle, backgroundColor: "#673AB7" }}
                onClick={handleSendMessage}
                disabled={isAiThinking}
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnityGameCompo;
