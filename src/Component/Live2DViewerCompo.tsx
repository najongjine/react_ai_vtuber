import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

// window에 PIXI 노출 (필수)
(window as any).PIXI = PIXI;

// [추가] v6에서는 Ticker를 명시적으로 등록해주는 것이 더 안전합니다.
Live2DModel.registerTicker(PIXI.Ticker);

const Live2DViewer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

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
      const modelUrl = "/hiyori_free_en/runtime/hiyori_free_t08.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        if (!isMounted || !app.stage) {
          model.destroy();
          return;
        }

        app.stage.addChild(model as any);

        model.x = 300;
        model.y = 300;
        model.scale.set(0.2);
        model.anchor.set(0.5, 0.5);

        // 인터랙션 (v6에서는 이 부분 에러가 사라집니다)
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

    return () => {
      isMounted = false;
      if (appRef.current) {
        // [변경] v6 스타일의 destroy 옵션
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} />;
};

export default Live2DViewer;
