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

  // 입 벌리기 파라미터 인덱스
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
      const modelUrl = "/mao_pro_ko/runtime/mao_pro.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        if (!app.stage) {
          model.destroy();
          return;
        }

        // ─────────────────────────────────────────────────────────────
        // [핵심 1] 마우스/터치 상호작용 완전 차단
        // ─────────────────────────────────────────────────────────────
        // 붓그리기/뒷짐포즈는 보통 마우스 클릭이나 터치에 반응하는 모션입니다.
        // 이걸 끄면 사용자가 건드려도 반응하지 않습니다.
        model.interactive = false;

        app.stage.addChild(model as any);
        model.anchor.set(0.5, 0.5);
        model.x = window.innerWidth / 2;
        model.y = window.innerHeight / 2 + 150;
        model.scale.set(0.1);

        modelRef.current = model;

        const internalModel = model.internalModel as any;
        const coreModel = internalModel.coreModel as any;

        // ─────────────────────────────────────────────────────────────
        // [핵심 2] 모델의 '자아' 없애기 (모든 모션 그룹 삭제)
        // ─────────────────────────────────────────────────────────────
        if (internalModel.motionManager) {
          // 1. 립싱크 끄기
          internalModel.motionManager.lipSync = false;

          // 2. 정의된 모든 모션 그룹(Idle, Tap, Special 등)을 싹 다 비움
          const definitions = internalModel.motionManager.definitions;
          if (definitions) {
            Object.keys(definitions).forEach((groupName) => {
              // 모든 그룹을 빈 배열로 만들어 실행 차단
              internalModel.motionManager.groups[groupName] = [];
            });
          }

          // 3. 강제 정지 (stop 함수가 존재할 경우에만)
          if (typeof internalModel.motionManager.stop === "function") {
            internalModel.motionManager.stop();
          }
        }

        // ─────────────────────────────────────────────────────────────
        // [핵심 3] 파라미터 연결
        // ─────────────────────────────────────────────────────────────
        const parameterIds = coreModel._parameterIds || [];
        const targetId = "ParamA";
        const index = parameterIds.indexOf(targetId);
        mouthOpenParamIndexRef.current = index;
      } catch (e) {
        console.error("모델 로드 실패:", e);
      }
    };

    loadModel();

    app.ticker.add(() => {
      if (!modelRef.current) return;

      const internalModel = modelRef.current.internalModel as any;
      const coreModel = internalModel?.coreModel as any;
      const mouthIndex = mouthOpenParamIndexRef.current;

      if (!coreModel || mouthIndex === -1) return;

      // [기존 문제] 0까지 내려가서 입을 꾹 다무는 구간이 있었음
      // const value = (Math.sin(Date.now() / 60) + 1) * 0.5;

      // [해결 공식]
      // 1. Math.abs : 둥근 물결 대신 뾰족하게 튀어오름 (더 다급해 보임)
      // 2. / 40 : 속도 더 빠르게
      // 3. * 0.8 + 0.2 : 입을 최소 0.2(20%)는 벌린 상태 유지 -> 절대 안 닫음
      const value = Math.abs(Math.sin(Date.now() / 40)) * 0.8 + 0.2;

      // 파라미터 값 강제 주입
      coreModel.setParameterValueByIndex(mouthIndex, value);
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
