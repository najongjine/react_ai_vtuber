import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

(window as any).PIXI = PIXI;

const Live2DViewer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // PIXI App을 ref에 담아 관리하면 수명주기 관리가 더 안전합니다.
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. 마운트 상태 추적을 위한 변수
    let isMounted = true;

    // PIXI Application 생성
    const app = new PIXI.Application({
      view: canvasRef.current,
      autoStart: true,
      resizeTo: window,
      backgroundAlpha: 0,
    });

    appRef.current = app; // ref에 저장

    const loadModel = async () => {
      const modelUrl = "/hiyori_free_en/runtime/hiyori_free_t08.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        // [핵심] 2. 모델 로드가 끝났을 때, 컴포넌트가 아직 살아있는지 확인합니다.
        // 이미 언마운트 되었다면(isMounted === false) 중단합니다.
        if (!isMounted || !app.stage) {
          model.destroy(); // 모델은 로드됐지만 쓸데없으니 메모리 해제
          return;
        }

        app.stage.addChild(model as any);

        model.x = 300;
        model.y = 300;
        model.scale.set(0.2);
        model.anchor.set(0.5, 0.5);

        model.on("hit", (hitAreas) => {
          if (hitAreas.includes("body")) {
            model.motion("tap_body");
          }
        });
      } catch (e) {
        console.error("모델 로드 실패:", e);
      }
    };

    loadModel();

    // Cleanup 함수
    return () => {
      // 3. 언마운트 되면 플래그를 false로 바꿉니다.
      isMounted = false;

      // 앱이 존재할 때만 파괴합니다.
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} />;
};

export default Live2DViewer;
