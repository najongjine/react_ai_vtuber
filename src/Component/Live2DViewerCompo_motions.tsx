import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import {
  Live2DModel,
  MotionPreloadStrategy,
} from "pixi-live2d-display/cubism4";
/**
 * 모션 파일명,설명 (추정),Group,Index,비고
mtn_01,기본 대기 (숨쉬기),Idle,0,자동 루프됨
mtn_02,일반 제스처 1,""""" (빈문자열)",0,
mtn_03,일반 제스처 2,""""" (빈문자열)",1,
mtn_04,일반 제스처 3,""""" (빈문자열)",2,
special_01,"이펙트 1 (하트, 폭발)",""""" (빈문자열)",3,화려함
special_02,"이펙트 2 (토끼, 오라)",""""" (빈문자열)",4,화려함
special_03,이펙트 3 (토끼 관련),""""" (빈문자열)",5,화려함
 */

(window as any).PIXI = PIXI;
Live2DModel.registerTicker(PIXI.Ticker);

interface Live2DViewerProps {
  isSpeaking: boolean;
}

// 모션 타입 정의 (자동완성을 위해)
type MotionGroup = "Idle" | "";
interface MotionDefinition {
  group: MotionGroup;
  index: number;
  name: string;
}

const MOTIONS: Record<string, MotionDefinition> = {
  mtn_02: { group: "", index: 0, name: "일반 2" },
  mtn_03: { group: "", index: 1, name: "일반 3" },
  mtn_04: { group: "", index: 2, name: "일반 4" },
  special_01: { group: "", index: 3, name: "스페셜 1 (하트)" },
  special_02: { group: "", index: 4, name: "스페셜 2 (토끼)" },
  special_03: { group: "", index: 5, name: "스페셜 3" },
};

const Live2DViewer = ({ isSpeaking }: Live2DViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);
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
        const model = await Live2DModel.from(modelUrl, {
          motionPreload: MotionPreloadStrategy.ALL, // 모션 미리 로딩 (버벅임 방지)
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

        // 마우스 상호작용 설정 (필요시 true)
        model.interactive = true;

        modelRef.current = model;

        // [중요 수정] 모션 매니저를 죽이는 코드를 삭제했습니다!
        // internalModel.motionManager.update = () => {}; <--- 삭제함

        // ParamA 인덱스 찾기
        const internalModel = model.internalModel as any;
        const coreModel = internalModel.coreModel as any;
        mouthOpenParamIndexRef.current =
          coreModel._parameterIds.indexOf("ParamA");
      } catch (e) {
        console.error("Load Error:", e);
      }
    };

    loadModel();

    // [립싱크 로직]
    // 모션 매니저가 살아있어도, Ticker에서 매 프레임 값을 덮어씌우면
    // 모션의 입모양을 무시하고 립싱크가 우선 적용됩니다.
    app.ticker.add(() => {
      if (!modelRef.current) return;

      const internalModel = modelRef.current.internalModel as any;
      const coreModel = internalModel?.coreModel as any;
      const mouthIndex = mouthOpenParamIndexRef.current;

      if (!coreModel || mouthIndex === -1) return;

      // isSpeaking prop에 따라 입 움직임 제어
      let value = 0;
      if (isSpeaking) {
        // 말할 때만 뻐끔거림 (0.0 ~ 1.0)
        value = Math.abs(Math.sin(Date.now() / 80)) * 0.8;
      }

      // [강제 주입] 모션이 재생 중이어도 이 값이 덮어씌워짐
      coreModel.setParameterValueByIndex(mouthIndex, value);
    });

    return () => {
      appRef.current?.destroy(true, { children: true });
    };
  }, [isSpeaking]); // isSpeaking이 바뀔 때 리렌더링 없이 로직 반영

  // [모션 재생 함수]
  const playMotion = (motionKey: string) => {
    if (!modelRef.current) return;

    const motion = MOTIONS[motionKey];
    if (motion) {
      console.log(`Playing motion: ${motion.name}`);
      // Priority.FORCE (3)을 사용하여 대기 모션 등을 무시하고 즉시 재생
      modelRef.current.motion(motion.group, motion.index, 3);
    }
  };

  return (
    <>
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

      {/* 테스트용 UI (실제 사용시에는 제거하거나 스타일링 하세요) */}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 100,
        }}
      >
        {Object.keys(MOTIONS).map((key) => (
          <button
            key={key}
            onClick={() => playMotion(key)}
            style={{
              padding: "10px",
              background: "white",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            {MOTIONS[key].name} 재생
          </button>
        ))}
      </div>
    </>
  );
};

export default Live2DViewer;
