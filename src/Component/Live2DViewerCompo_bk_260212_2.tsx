import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as PIXI from "pixi.js";
import {
  Live2DModel,
  MotionPreloadStrategy,
} from "pixi-live2d-display/cubism4";
import { MAO_MOTIONS } from "./Live2DMaoConstants";

export interface Live2DController {
  playMotion: (motionKey: keyof typeof MAO_MOTIONS) => void;
  setExpression: (expressionId: string) => void;
  stopSpeaking: () => void;
}

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



    useImperativeHandle(ref, () => ({
      playMotion: (motionKey) => {
        if (!modelRef.current) return;
        const motion = MAO_MOTIONS[motionKey];
        console.log(`Playing Motion: ${motionKey}`);
        modelRef.current.motion(motion.group, motion.index, 3);
      },
      setExpression: (expressionId: string) => {
        if (!modelRef.current) return;
        const internalModel = modelRef.current.internalModel as any;
        // expressionManager가 있는지 확인 후 실행
        if (internalModel.motionManager && internalModel.motionManager.expressionManager) {
          console.log(`Setting Expression: ${expressionId}`);
          // internalModel.motionManager.expressionManager.setExpression(expressionId);
          // pixi-live2d-display의 버전에 따라 다를 수 있음. 보통은 motionManager.expressionManager.setExpression
          // 또는 internalModel.expressionManager 일 수도 있음.
          // 안전하게 try-catch
          try {
            internalModel.motionManager.expressionManager.setExpression(expressionId);
          } catch (e) {
            console.error("Expression Error:", e);
          }
        } else {
          console.warn("ExpressionManager not found");
        }
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
        resizeTo: window,
        transparent: true,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1, // [Fix] 고해상도 지원
        autoDensity: true,
      });
      appRef.current = app;

      const loadModel = async () => {
        try {
          const model = await Live2DModel.from(modelUrl, {
            motionPreload: MotionPreloadStrategy.ALL,
            autoInteract: false, // [Fix] 기본 상호작용 비활성화 (모션 충돌 방지)
          });

          if (!app.stage) {
            model.destroy();
            return;
          }

          app.stage.addChild(model as any);
          model.anchor.set(0.0, 0.5);
          model.x = window.innerWidth * 0.01;
          model.y = window.innerHeight / 2 - 10;
          model.scale.set(0.1);
          model.interactive = true;

          modelRef.current = model;

          const internalModel = model.internalModel as any;
          const coreModel = internalModel.coreModel as any;
          const index = coreModel._parameterIds.indexOf("ParamA");
          mouthOpenParamIndexRef.current = index;

          // [Fix] 초기 Idle 모션 강제 실행
          if (internalModel.motionManager) {
            console.log("Starting Idle Motion...");
            internalModel.motionManager.startMotion("Idle", 0);
          }

          // [Debug] ExpressionManager 확인
          if (internalModel.motionManager?.expressionManager) {
            console.log("ExpressionManager Loaded");
          } else {
            console.warn("ExpressionManager NOT Loaded");
          }

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

      // [Fix] 모델 강제 업데이트 (Ticker 문제 방지)
      const modelUpdateFn = (delta: number) => {
        if (modelRef.current) {
          modelRef.current.update(appRef.current!.ticker.deltaMS);
        }
      };
      appRef.current.ticker.add(modelUpdateFn);

      return () => {
        appRef.current?.ticker.remove(tickerFn);
        appRef.current?.ticker.remove(modelUpdateFn);
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
