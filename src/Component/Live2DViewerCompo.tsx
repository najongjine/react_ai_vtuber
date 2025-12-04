import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as PIXI from "pixi.js";
import {
  Live2DModel,
  MotionPreloadStrategy,
} from "pixi-live2d-display/cubism4";
import { MAO_MOTIONS, Live2DController } from "./Live2DMaoConstants"; // 위에서 정의한 상수 import

(window as any).PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

interface Live2DViewerProps {
  isSpeaking: boolean; // 말하는 중인지 여부 (Props로 제어)
  modelUrl?: string; // 모델 경로 (기본값 설정 가능)
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

    // 1. 외부에서 사용할 함수들을 노출 (playMotion 등)
    useImperativeHandle(ref, () => ({
      playMotion: (motionKey) => {
        if (!modelRef.current) return;
        const motion = MAO_MOTIONS[motionKey];
        // 우선순위 3(FORCE)으로 설정하여 대기 모션을 덮어쓰고 즉시 재생
        console.log(`Playing Motion: ${motionKey}`);
        modelRef.current.motion(motion.group, motion.index, 3);
      },
      stopSpeaking: () => {
        // 강제로 입을 다물게 할 때 사용 (필요시)
        if (modelRef.current && mouthOpenParamIndexRef.current !== -1) {
          const core: any = modelRef.current.internalModel.coreModel;
          core?.setParameterValueByIndex(mouthOpenParamIndexRef.current, 0);
        }
      },
    }));

    // 2. PIXI App 및 모델 로드 초기화
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
          // MotionPreloadStrategy.ALL: 모션을 미리 로딩하여 끊김 방지
          const model = await Live2DModel.from(modelUrl, {
            motionPreload: MotionPreloadStrategy.ALL,
          });

          if (!app.stage) {
            model.destroy();
            return;
          }

          // 모델 배치
          app.stage.addChild(model as any);
          model.anchor.set(0.5, 0.5);
          model.x = window.innerWidth / 2;
          model.y = window.innerHeight / 2 + 100;
          model.scale.set(0.1);

          // 모션을 위해 인터랙티브 활성화 (선택)
          model.interactive = true;

          modelRef.current = model;

          // [중요] 모션 매니저 삭제 코드 제거함!
          // (모션을 재생해야 하므로 motionManager를 살려둡니다)

          // ParamA (입 벌림) 인덱스 캐싱
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

    // 3. 립싱크 및 애니메이션 제어 (Ticker)
    useEffect(() => {
      if (!appRef.current) return;

      const tickerFn = () => {
        if (!modelRef.current) return;

        const internalModel = modelRef.current.internalModel as any;
        const coreModel = internalModel?.coreModel as any;
        const mouthIndex = mouthOpenParamIndexRef.current;

        if (!coreModel || mouthIndex === -1) return;

        // [립싱크 로직]
        // isSpeaking이 true일 때만 입을 움직입니다.
        // 모션이 재생 중이라도, 여기서 값을 매 프레임 덮어쓰기 때문에 립싱크가 유지됩니다.
        let mouthValue = 0;

        if (isSpeaking) {
          // 사인파를 이용해 자연스러운 입모양 시뮬레이션 (속도조절: /40, 크기: 0.8)
          mouthValue = Math.abs(Math.sin(Date.now() / 50)) * 0.8;
        } else {
          // 말하지 않을 때는 입을 다뭄 (부드럽게 닫히게 하려면 보간 로직 추가 가능)
          mouthValue = 0;
        }

        // 파라미터 강제 주입
        coreModel.setParameterValueByIndex(mouthIndex, mouthValue);
      };

      appRef.current.ticker.add(tickerFn);

      return () => {
        appRef.current?.ticker.remove(tickerFn);
      };
    }, [isSpeaking]); // isSpeaking 상태가 변할 때마다 Ticker 로직 업데이트

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
          pointerEvents: "none", // 클릭이 캔버스를 통과하게 할지 여부
        }}
      />
    );
  }
);

export default Live2DViewer;
