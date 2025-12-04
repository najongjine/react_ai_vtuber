import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as PIXI from "pixi.js";
import {
  Live2DModel,
  MotionPreloadStrategy,
} from "pixi-live2d-display/cubism4";
import { MAO_MOTIONS, Live2DController } from "./Live2DMaoConstants";

(window as any).PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

interface Live2DViewerProps {
  isSpeaking: boolean;
  modelUrl?: string;
}

const Live2DViewer = forwardRef<Live2DController, Live2DViewerProps>(
  (
    { isSpeaking, modelUrl = "/mao_pro_ko/runtime/mao_pro.model3.json" },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const modelRef = useRef<Live2DModel | null>(null);
    const mouthOpenParamIndexRef = useRef<number>(-1);

    // [추가] 원래의 MotionManager update 함수를 백업할 Ref
    const originalUpdateRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      playMotion: (motionKey) => {
        if (!modelRef.current) return;
        const motion = MAO_MOTIONS[motionKey];
        console.log(`Playing Motion: ${motionKey}`);
        modelRef.current.motion(motion.group, motion.index, 3);
      },
      stopSpeaking: () => {
        if (modelRef.current && mouthOpenParamIndexRef.current !== -1) {
          const core: any = modelRef.current.internalModel.coreModel;
          core?.setParameterValueByIndex(mouthOpenParamIndexRef.current, 0);
        }
      },
    }));

    // ... (PIXI App 및 모델 로드 초기화 useEffect는 기존과 동일하므로 생략 가능하지만 문맥 유지를 위해 포함) ...
    useEffect(() => {
      if (!canvasRef.current || appRef.current) return;

      const app = new PIXI.Application({
        view: canvasRef.current,
        autoStart: true,
        resizeTo: window,
        transparent: true,
      });
      appRef.current = app;

      const loadModel = async () => {
        try {
          const model = await Live2DModel.from(modelUrl, {
            motionPreload: MotionPreloadStrategy.ALL,
          });

          if (!app.stage) {
            model.destroy();
            return;
          }

          app.stage.addChild(model as any);
          model.anchor.set(0.5, 0.5);
          model.x = window.innerWidth / 2;
          model.y = window.innerHeight / 2 + 100;
          model.scale.set(0.1);
          model.interactive = true;

          modelRef.current = model;

          const internalModel = model.internalModel as any;
          const coreModel = internalModel.coreModel as any;
          const index = coreModel._parameterIds.indexOf("ParamA");
          mouthOpenParamIndexRef.current = index;
        } catch (e) {
          console.error("Model Load Failed:", e);
        }
      };

      loadModel();

      return () => {
        app.destroy(true, { children: true });
        appRef.current = null;
      };
    }, [modelUrl]);

    // [핵심 로직 추가] isSpeaking 상태에 따라 MotionManager 잠금/해제
    useEffect(() => {
      if (!modelRef.current) return;

      const internalModel = modelRef.current.internalModel as any;
      const motionManager = internalModel.motionManager;

      if (!motionManager) return;

      if (isSpeaking) {
        // 1. 말하는 중일 때: 모션 매니저 무력화 (자동 모션 방지)

        // 아직 백업된 함수가 없다면 현재 함수를 백업
        if (!originalUpdateRef.current) {
          originalUpdateRef.current = motionManager.update;
        }

        // 업데이트 함수를 빈 함수로 교체하여 동작을 멈춤
        motionManager.update = () => {};
      } else {
        // 2. 말하기가 끝났을 때: 모션 매니저 복구

        // 백업된 함수가 있다면 원상복구
        if (originalUpdateRef.current) {
          motionManager.update = originalUpdateRef.current;
          originalUpdateRef.current = null; // 초기화
        }
      }
    }, [isSpeaking]); // isSpeaking이 변경될 때마다 실행

    // 립싱크 및 애니메이션 제어 (Ticker) - 기존 코드 유지
    useEffect(() => {
      if (!appRef.current) return;

      const tickerFn = () => {
        if (!modelRef.current) return;

        const internalModel = modelRef.current.internalModel as any;
        const coreModel = internalModel?.coreModel as any;
        const mouthIndex = mouthOpenParamIndexRef.current;

        if (!coreModel || mouthIndex === -1) return;

        let mouthValue = 0;

        if (isSpeaking) {
          mouthValue = Math.abs(Math.sin(Date.now() / 90)) * 0.8 + 0.2;
          // 여기서 입 모양 파라미터를 강제로 주입
          coreModel.setParameterValueByIndex(mouthIndex, mouthValue);
        } else {
          // 말하지 않을 때는 입을 다뭄 (필요시 0으로 강제 세팅)
          // coreModel.setParameterValueByIndex(mouthIndex, 0);
        }
      };

      appRef.current.ticker.add(tickerFn);

      return () => {
        appRef.current?.ticker.remove(tickerFn);
      };
    }, [isSpeaking]);

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
  }
);

export default Live2DViewer;
