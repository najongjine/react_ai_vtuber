import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

// window에 PIXI 노출 (필수)
(window as any).PIXI = PIXI;

// v6에서는 Ticker를 명시적으로 등록해주는 것이 더 안전합니다.
Live2DModel.registerTicker(PIXI.Ticker);

interface Live2DViewerProps {
  isSpeaking: boolean;
}

const Live2DViewer = ({ isSpeaking }: Live2DViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  /** 모델 참조 저장 */
  const modelRef = useRef<Live2DModel | null>(null);

  /** isSpeaking 값을 Ticker 내부에서 실시간으로 읽기 위해 Ref 사용 */
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let isMounted = true;

    // PIXI Application 생성 (v6 방식)
    const app = new PIXI.Application({
      view: canvasRef.current,
      autoStart: true,
      resizeTo: window,
      transparent: true, // [변경] v7의 backgroundAlpha: 0 대신 v6는 transparent: true를 씁니다.
    });

    appRef.current = app;

    const loadModel = async () => {
      // 모델 경로
      const modelUrl = "/mao_pro_ko/runtime/mao_pro.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        if (!isMounted || !app.stage) {
          model.destroy();
          return;
        }
        if (model.internalModel.motionManager.expressionManager) {
          console.log(
            "표정 목록:",
            model.internalModel.motionManager.expressionManager.definitions
          );
        } else {
          console.log("이 모델은 표정 설정이 따로 없습니다.");
        }

        app.stage.addChild(model as any);
        model.anchor.set(0, 0.5);
        model.x = window.innerWidth * 0.01;
        model.y = window.innerHeight - 400;
        model.scale.set(0.1);

        // 모델 참조 저장 (Ticker에서 사용)
        modelRef.current = model;

        // 인터랙션 (v6에서는 이 부분 에러가 사라집니다)
        model.on("hit", (hitAreas) => {
          console.log("클릭된 부위(hitAreas):", hitAreas);
          console.log(
            "모션 그룹 목록:",
            Object.keys(model.internalModel.motionManager.definitions)
          );
          if (hitAreas.includes("Body")) {
            console.log("--> 'body' 부위 감지됨! tap_body 모션 실행 시도");
            model.motion("FlickDown");
          }
        });
      } catch (e) {
        console.error("모델 로드 실패:", e);
      }
    };

    loadModel();

    // 립싱크 애니메이션 루프
    app.ticker.add(() => {
      if (modelRef.current && modelRef.current.internalModel) {
        const coreModel = modelRef.current.internalModel.coreModel;

        if (isSpeakingRef.current) {
          // 말하고 있을 때: 사인파(Sine wave)를 이용해 입을 자연스럽게 뻐끔거림
          // 속도(15)와 크기(0.8)는 취향껏 조절
          const value = Math.abs(Math.sin(Date.now() / 100)) * 0.8;
          coreModel.setParameterValueById("ParamMouthOpenY", value);
        } else {
          // 말하지 않을 때: 입을 다뭄 (부드럽게 0으로 수렴하게 하거나 강제 0 설정)
          coreModel.setParameterValueById("ParamMouthOpenY", 0);
        }
      }
    });

    return () => {
      isMounted = false;
      if (appRef.current) {
        // [변경] v6 스타일의 destroy 옵션
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", // 화면 스크롤 상관없이 고정
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1, // 글씨(Header) 뒤로 보내기 (필요하면 제거)
        pointerEvents: "none", // 클릭이 캔버스 뚫고 뒤에 버튼 눌리게 하려면 추가 (선택)
      }}
    />
  );
};

export default Live2DViewer;
