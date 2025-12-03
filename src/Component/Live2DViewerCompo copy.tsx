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
  const modelRef = useRef<Live2DModel | null>(null); // 모델 참조용
  const mouthOpenParamIndexRef = useRef<number>(-1);

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
      const modelUrl = "/mao_pro_ko/runtime/mao_pro.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        if (!app.stage) {
          model.destroy();
          return;
        }

        // 1. 화면에 배치
        app.stage.addChild(model as any);
        model.anchor.set(0.5, 0.5);
        model.x = window.innerWidth / 2;
        model.y = window.innerHeight / 2 + 100;
        model.scale.set(0.1);
        model.interactive = false; // 마우스 반응 차단

        modelRef.current = model;

        // [핵심 1] 모션 매니저 완전 거세 (붓질의 원흉)
        const internalModel = model.internalModel as any;
        if (internalModel.motionManager) {
          // 모션 업데이트 함수를 빈 껍데기로 바꿔치기 -> 동작 계산 자체를 못하게 만듦
          internalModel.motionManager.update = () => {};
        }

        // [핵심 2] ParamA 인덱스 찾기
        const coreModel = internalModel.coreModel as any;
        const index = coreModel._parameterIds.indexOf("ParamA");
        mouthOpenParamIndexRef.current = index;

        console.log("ParamA Index:", index); // -1이면 안됨
      } catch (e) {
        console.error("Load Error:", e);
      }
    };

    loadModel();

    // [핵심 3] 무조건 작동하는 Ticker 사용 (model.on 안씀)
    app.ticker.add(() => {
      if (!modelRef.current) return;

      const internalModel = modelRef.current.internalModel as any;
      const coreModel = internalModel?.coreModel as any;
      const mouthIndex = mouthOpenParamIndexRef.current;

      if (!coreModel || mouthIndex === -1) return;

      // [강제 주입]
      // 모션 매니저를 죽였으므로(update = null), 이제 이 값이 덮어씌워지지 않고 유지됨
      // 0.2 ~ 1.0 무한 반복
      const value = Math.abs(Math.sin(Date.now() / 40)) * 0.8 + 0.2;

      coreModel.setParameterValueByIndex(mouthIndex, value);
    });

    return () => {
      appRef.current?.destroy(true, { children: true });
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
