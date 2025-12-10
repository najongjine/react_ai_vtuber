// import React, { useState, useRef, useEffect } from "react";
// import Live2DViewerCompo from "../Component/Live2DViewerCompo";
// import { MAO_MOTIONS, Live2DController } from "../Component/Live2DMaoConstants";
// import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";

// // 환경변수에서 API 키 가져오기
// const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(API_KEY);

// // 대화 메시지 타입 정의
// interface ChatMessage {
//   role: "user" | "ai";
//   text: string;
//   images?: string[]; // 이미지 미리보기용 URL (선택사항)
// }

// const AiVtuber: React.FC = () => {
//   // --- 상태 관리 ---
//   const [inputText, setInputText] = useState("");
//   const [selectedImages, setSelectedImages] = useState<File[]>([]);

//   // 대화 기록 배열 사용
//   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

//   const [isStreaming, setIsStreaming] = useState(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);

//   // --- Refs ---
//   const chatSessionRef = useRef<ChatSession | null>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const live2dRef = useRef<Live2DController>(null);
//   const chatContainerRef = useRef<HTMLDivElement>(null); // 스크롤 제어용

//   // --- 음성 목록 로드 ---
//   useEffect(() => {
//     const loadVoices = () => {
//       window.speechSynthesis.getVoices();
//     };
//     loadVoices();
//     window.speechSynthesis.onvoiceschanged = loadVoices;
//   }, []);

//   // --- 채팅이 업데이트될 때마다 스크롤 아래로 이동 ---
//   useEffect(() => {
//     if (chatContainerRef.current) {
//       chatContainerRef.current.scrollTop =
//         chatContainerRef.current.scrollHeight;
//     }
//   }, [chatHistory, isStreaming]);

//   // --- 헬퍼 함수: 이미지 파일을 Gemini용 포맷으로 변환 ---
//   const fileToGenerativePart = async (file: File) => {
//     const base64EncodedDataPromise = new Promise<string>((resolve) => {
//       const reader = new FileReader();
//       reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
//       reader.readAsDataURL(file);
//     });
//     return {
//       inlineData: {
//         data: await base64EncodedDataPromise,
//         mimeType: file.type,
//       },
//     };
//   };

//   // --- 채팅 초기화 ---
//   const handleResetChat = () => {
//     if (isStreaming) return;
//     chatSessionRef.current = null;
//     setChatHistory([]); // 기록 초기화
//     setInputText("");
//     setSelectedImages([]);
//   };

//   // --- Live2D 모션 재생 함수 ---
//   const triggerMotion = (motionKey: keyof typeof MAO_MOTIONS) => {
//     if (live2dRef.current) {
//       live2dRef.current.playMotion(motionKey);
//     }
//   };

//   // --- TTS (말하기) 함수 ---
//   const speak = (text: string) => {
//     if (typeof window !== "undefined" && window.speechSynthesis) {
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.lang = "ko-KR";
//       utterance.rate = 1.0;
//       utterance.pitch = 1.0;

//       const voices = window.speechSynthesis.getVoices();
//       const korVoice = voices.find(
//         (v) => v.lang === "ko-KR" && v.name.includes("Google")
//       );
//       if (korVoice) utterance.voice = korVoice;

//       utterance.onstart = () => setIsSpeaking(true);
//       utterance.onend = () => setIsSpeaking(false);
//       utterance.onerror = () => setIsSpeaking(false);

//       window.speechSynthesis.speak(utterance);
//     }
//   };

//   // --- 메시지 전송 및 Gemini 호출 ---
//   const handleSendMessage = async () => {
//     if ((!inputText.trim() && selectedImages.length === 0) || isStreaming)
//       return;

//     setIsStreaming(true);

//     const prompt = inputText;
//     const imagesToSend = [...selectedImages];
//     // 미리보기용 이미지 URL 생성
//     const imageUrls = imagesToSend.map((file) => URL.createObjectURL(file));

//     // 1. 사용자 메시지를 대화 기록에 추가
//     setChatHistory((prev) => [
//       ...prev,
//       { role: "user", text: prompt, images: imageUrls },
//     ]);

//     setInputText("");
//     setSelectedImages([]);

//     // 질문 보낼 때 모션
//     triggerMotion("TAP_BODY_1");

//     try {
//       const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//       if (!chatSessionRef.current) {
//         chatSessionRef.current = model.startChat({ history: [] });
//       }

//       const imageParts = await Promise.all(
//         imagesToSend.map((file) => fileToGenerativePart(file))
//       );

//       // 2. AI 응답을 위한 빈 메시지 추가 (나중에 스트리밍으로 채움)
//       setChatHistory((prev) => [
//         ...prev,
//         { role: "ai", text: "..." }, // 로딩 표시
//       ]);

//       const result = await chatSessionRef.current.sendMessageStream([
//         prompt,
//         ...imageParts,
//       ]);

//       let fullResponseText = "";
//       let currentSentence = "";

//       for await (const chunk of result.stream) {
//         const chunkText = chunk.text();
//         fullResponseText += chunkText;
//         currentSentence += chunkText;

//         // 3. 스트리밍 중인 텍스트로 마지막 AI 메시지 업데이트
//         setChatHistory((prev) => {
//           const newHistory = [...prev];
//           const lastIndex = newHistory.length - 1;
//           // 마지막 메시지가 AI 메시지라고 가정하고 업데이트
//           if (newHistory[lastIndex].role === "ai") {
//             newHistory[lastIndex] = {
//               ...newHistory[lastIndex],
//               text: fullResponseText,
//             };
//           }
//           return newHistory;
//         });

//         // 문장 단위로 끊어서 읽기
//         if (/[.!?\n]/.test(chunkText)) {
//           speak(currentSentence);
//           currentSentence = "";
//         }
//       }

//       if (currentSentence.trim()) {
//         speak(currentSentence);
//       }
//     } catch (error: any) {
//       console.error("Gemini API Error:", error);
//       // 에러 메시지 추가
//       setChatHistory((prev) => [
//         ...prev,
//         {
//           role: "ai",
//           text: "죄송해요, 에러가 발생했어요. 다시 말씀해 주시겠어요?",
//         },
//       ]);
//       chatSessionRef.current = null;
//     } finally {
//       setIsStreaming(false);
//     }
//   };

//   /** --- 붙여넣기(Ctrl+V) 처리 --- */
//   const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
//     const items = e.clipboardData.items;
//     const imageFiles: File[] = [];

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i];
//       if (item.type.indexOf("image") !== -1) {
//         const file = item.getAsFile();
//         if (file) imageFiles.push(file);
//       }
//     }

//     if (imageFiles.length > 0) {
//       e.preventDefault();
//       setSelectedImages((prev) => [...prev, ...imageFiles]);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (e.nativeEvent.isComposing) return;
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       const filesArray = Array.from(e.target.files);
//       setSelectedImages((prev) => [...prev, ...filesArray]);
//     }
//   };

//   const removeImage = (indexToRemove: number) => {
//     setSelectedImages((prev) =>
//       prev.filter((_, index) => index !== indexToRemove)
//     );
//   };

//   return (
//     <div
//       style={{
//         position: "relative",
//         width: "100%",
//         height: "100vh",
//         overflow: "hidden",
//       }}
//     >
//       {/* --- 상단 헤더 --- */}
//       <div
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           width: "100%",
//           padding: "20px",
//           textAlign: "center",
//           zIndex: 50,
//           display: "flex",
//           justifyContent: "center",
//           alignItems: "center",
//           gap: "20px",
//         }}
//       >
//         <h1
//           style={{ margin: 0, textShadow: "0 2px 4px rgba(255,255,255,0.8)" }}
//         >
//           AI Vtuber
//         </h1>
//         <button
//           onClick={handleResetChat}
//           disabled={isStreaming}
//           style={{
//             padding: "8px 16px",
//             fontSize: "14px",
//             borderRadius: "8px",
//             border: "none",
//             background: isStreaming ? "#aaa" : "#50E3C2",
//             color: "white",
//             cursor: isStreaming ? "not-allowed" : "pointer",
//             boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
//           }}
//         >
//           🔄 대화 초기화
//         </button>
//       </div>

//       {/* --- Live2D 뷰어 (배경) --- */}
//       <Live2DViewerCompo ref={live2dRef} isSpeaking={isSpeaking} />

//       {/* --- [수정됨] 우측 사이드 패널 --- */}
//       <div
//         style={{
//           // position: 'fixed'를 사용하여 브라우저 창 기준으로 오른쪽 끝에 고정합니다.
//           position: "fixed",
//           top: "80px",
//           right: "4px", // [수정] 오른쪽 끝에 아주 가깝게 붙임 (살짝 띄움)
//           bottom: "160px",
//           width: "360px",
//           backgroundColor: "rgba(255, 255, 255, 0.8)",
//           backdropFilter: "blur(5px)",
//           borderRadius: "20px",
//           border: "2px solid #333",
//           boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
//           zIndex: 40,
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//         }}
//       >
//         {/* 1. 모션 버튼 영역 (가로 일렬 배치) */}
//         <div
//           style={{
//             padding: "10px",
//             borderBottom: "1px solid #ddd",
//             display: "flex",
//             flexDirection: "row", // [수정] 가로 방향 배치
//             justifyContent: "space-between",
//             gap: "5px",
//             backgroundColor: "rgba(255,255,255,0.5)",
//           }}
//         >
//           <button
//             onClick={() => triggerMotion("SPECIAL_HEART")}
//             style={{ ...btnStyle, flex: 1 }} // [수정] flex: 1로 너비 균등 분할
//           >
//             ❤️ 하트
//           </button>
//           <button
//             onClick={() => triggerMotion("SPECIAL_RABBIT_MAGIC")}
//             style={{ ...btnStyle, flex: 1 }}
//           >
//             🐰 마술
//           </button>
//           <button
//             onClick={() => triggerMotion("TAP_BODY_3")}
//             style={{ ...btnStyle, flex: 1 }}
//           >
//             👋 인사
//           </button>
//         </div>

//         {/* 2. 채팅 내역 영역 (스크롤 가능) */}
//         <div
//           ref={chatContainerRef}
//           style={{
//             flex: 1,
//             overflowY: "auto",
//             padding: "15px",
//             display: "flex",
//             flexDirection: "column",
//             gap: "15px",
//           }}
//         >
//           {chatHistory.length === 0 ? (
//             <div
//               style={{ textAlign: "center", color: "#888", marginTop: "20px" }}
//             >
//               대화를 시작해보세요!
//             </div>
//           ) : (
//             chatHistory.map((msg, idx) => (
//               <div
//                 key={idx}
//                 style={{
//                   alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
//                   maxWidth: "90%",
//                   backgroundColor: msg.role === "user" ? "#4A90E2" : "#FFF",
//                   color: msg.role === "user" ? "white" : "black",
//                   borderRadius: "15px",
//                   borderTopRightRadius: msg.role === "user" ? "2px" : "15px",
//                   borderTopLeftRadius: msg.role === "ai" ? "2px" : "15px",
//                   padding: "10px 14px",
//                   boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
//                   wordBreak: "break-word",
//                   lineHeight: "1.5",
//                   whiteSpace: "pre-wrap",
//                 }}
//               >
//                 {/* 사용자 이미지 미리보기 */}
//                 {msg.images && msg.images.length > 0 && (
//                   <div
//                     style={{
//                       display: "flex",
//                       gap: "5px",
//                       marginBottom: "5px",
//                       flexWrap: "wrap",
//                     }}
//                   >
//                     {msg.images.map((imgUrl, i) => (
//                       <img
//                         key={i}
//                         src={imgUrl}
//                         alt="attachment"
//                         style={{
//                           width: "50px",
//                           height: "50px",
//                           objectFit: "cover",
//                           borderRadius: "5px",
//                         }}
//                       />
//                     ))}
//                   </div>
//                 )}

//                 {/* AI 이름 표시 (선택 사항) */}
//                 {msg.role === "ai" && (
//                   <div
//                     style={{
//                       fontSize: "12px",
//                       color: "#4A90E2",
//                       marginBottom: "4px",
//                       fontWeight: "bold",
//                     }}
//                   >
//                     AI Vtuber
//                   </div>
//                 )}

//                 {msg.text}
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* --- 하단 입력창 영역 (기존 유지) --- */}
//       <div
//         style={{
//           position: "fixed",
//           bottom: "40px",
//           left: "50%",
//           transform: "translateX(-50%)",
//           width: "600px",
//           maxWidth: "90%",
//           padding: "15px",
//           backgroundColor: "rgba(255, 255, 255, 0.95)",
//           borderRadius: "15px",
//           boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
//           zIndex: 100,
//           display: "flex",
//           flexDirection: "column",
//           gap: "10px",
//         }}
//       >
//         {/* 선택된 이미지 미리보기 */}
//         {selectedImages.length > 0 && (
//           <div
//             style={{
//               display: "flex",
//               gap: "10px",
//               overflowX: "auto",
//               paddingBottom: "5px",
//             }}
//           >
//             {selectedImages.map((file, index) => (
//               <div key={index} style={{ position: "relative", flexShrink: 0 }}>
//                 <img
//                   src={URL.createObjectURL(file)}
//                   alt="preview"
//                   style={{
//                     width: "60px",
//                     height: "60px",
//                     objectFit: "cover",
//                     borderRadius: "8px",
//                     border: "1px solid #ddd",
//                   }}
//                 />
//                 <button
//                   onClick={() => removeImage(index)}
//                   style={{
//                     position: "absolute",
//                     top: "-5px",
//                     right: "-5px",
//                     background: "red",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "50%",
//                     width: "20px",
//                     height: "20px",
//                     cursor: "pointer",
//                     fontSize: "12px",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   ×
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* 입력 컨트롤 */}
//         <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
//           <input
//             type="file"
//             multiple
//             accept="image/*"
//             ref={fileInputRef}
//             style={{ display: "none" }}
//             onChange={handleFileChange}
//           />
//           <button
//             onClick={() => fileInputRef.current?.click()}
//             style={{
//               background: "none",
//               border: "none",
//               cursor: "pointer",
//               fontSize: "24px",
//               padding: "5px",
//               color: "#555",
//             }}
//             title="이미지 첨부"
//           >
//             📎
//           </button>

//           <textarea
//             value={inputText}
//             onChange={(e) => setInputText(e.target.value)}
//             onPaste={handlePaste}
//             onKeyDown={handleKeyDown}
//             placeholder={
//               isStreaming ? "AI가 답변 중입니다..." : "메시지를 입력하세요..."
//             }
//             rows={1}
//             disabled={isStreaming}
//             style={{
//               flex: 1,
//               padding: "12px",
//               fontSize: "16px",
//               border: "1px solid #ddd",
//               borderRadius: "10px",
//               outline: "none",
//               resize: "none",
//               minHeight: "46px",
//               maxHeight: "150px",
//               fontFamily: "inherit",
//               overflowY: "auto",
//               backgroundColor: isStreaming ? "#f5f5f5" : "white",
//             }}
//           />

//           <button
//             onClick={handleSendMessage}
//             disabled={isStreaming}
//             style={{
//               height: "46px",
//               padding: "0 20px",
//               fontSize: "16px",
//               fontWeight: "bold",
//               color: "white",
//               backgroundColor: isStreaming ? "#ccc" : "#4A90E2",
//               border: "none",
//               borderRadius: "10px",
//               cursor: isStreaming ? "not-allowed" : "pointer",
//               transition: "background 0.2s",
//             }}
//           >
//             {isStreaming ? "..." : "전송"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // 버튼 스타일 간단 정의
// const btnStyle: React.CSSProperties = {
//   padding: "8px",
//   backgroundColor: "#fff",
//   border: "1px solid #ccc",
//   borderRadius: "5px",
//   cursor: "pointer",
//   textAlign: "center" as const,
//   fontWeight: "bold",
//   fontSize: "13px",
//   boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
//   whiteSpace: "nowrap",
// };

// export default AiVtuber;
