import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

(window as any).PIXI = PIXI;

Live2DModel.registerTicker(PIXI.Ticker);

interface Live2DViewerProps {
  isSpeaking: boolean;
}

const Live2DViewer = ({ isSpeaking }: Live2DViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);
  const isSpeakingRef = useRef(isSpeaking);

  // [수정] 입 벌리기 파라미터 인덱스
  const mouthOpenParamIndexRef = useRef<number>(-1);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      view: canvasRef.current,
      autoStart: true,
      resizeTo: window,
      transparent: true,
    });

    appRef.current = app;

    const loadModel = async () => {
      // 모델 경로 확인 (본인 경로에 맞게 수정)
      const modelUrl = "/mao_pro_ko/runtime/mao_pro.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        if (!app.stage) {
          model.destroy();
          return;
        }

        app.stage.addChild(model as any);
        model.anchor.set(0.5, 0.5);
        model.x = window.innerWidth / 2;
        model.y = window.innerHeight / 2 + 150;
        model.scale.set(0.1);

        modelRef.current = model;

        const internalModel = model.internalModel as any;
        const coreModel = internalModel.coreModel as any;

        // ─────────────────────────────────────────────────────────────
        // [핵심 1] 자동 제어 끄기 (충돌 방지)
        // ─────────────────────────────────────────────────────────────
        if (internalModel.motionManager) {
          internalModel.motionManager.lipSync = false; // 자동 립싱크 끄기
        }

        // ─────────────────────────────────────────────────────────────
        // [핵심 2] 파라미터 찾기 (ParamA를 강제로 찾음)
        // ─────────────────────────────────────────────────────────────
        const parameterIds = coreModel._parameterIds || [];

        // 보내주신 목록에 'ParamA'가 확실히 존재하므로, 그걸 찾습니다.
        const targetId = "ParamA";
        const index = parameterIds.indexOf(targetId);

        mouthOpenParamIndexRef.current = index;

        if (index !== -1) {
          console.log(`✅ 입 파라미터 확정: ${targetId} (Index: ${index})`);
        } else {
          console.error(
            `❌ ParamA를 찾을 수 없습니다. 모델 파일을 확인하세요.`
          );
        }
      } catch (e) {
        console.error("모델 로드 실패:", e);
      }
    };

    loadModel();

    // ─────────────────────────────────────────────────────────────
    // [핵심 3] 말할 때 'ParamA' 값을 흔들어줌
    // ─────────────────────────────────────────────────────────────
    app.ticker.add(() => {
      if (!modelRef.current) return;

      const internalModel = modelRef.current.internalModel as any;
      const coreModel = internalModel?.coreModel as any;
      const mouthIndex = mouthOpenParamIndexRef.current;

      if (!coreModel || mouthIndex === -1) return;

      // [수정 포인트] isSpeaking 조건 없이 무조건 움직임 값을 넣습니다.
      // 0.0 ~ 1.0 사이를 반복 (ParamA가 맞다면 입이 계속 벌어졌다 닫혔다 해야 함)
      const value = Math.abs(Math.sin(Date.now() / 100)) * 1.0;

      // 파라미터 값 주입
      coreModel.setParameterValueByIndex(mouthIndex, value);

      // 혹시 몰라 update 호출 (보통 자동이지만 확실하게 하기 위해)
      // coreModel.update(); // 필요 시 주석 해제
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
};

export default Live2DViewer;
