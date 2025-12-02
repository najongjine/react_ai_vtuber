import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";

// 주의: 상단에서 'pixi-live2d-display'를 import 하지 않습니다!
// (여기서 import 하면 스크립트 로딩 전에 실행되어 에러가 납니다.)

(window as any).PIXI = PIXI;

export default function Live2DViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (appRef.current) return;

    const app = new PIXI.Application({
      view: canvasRef.current,
      autoStart: true,
      backgroundAlpha: 0,
      resizeTo: window,
    });

    const loadLive2D = async () => {
      // 1. 여기서 라이브러리를 '동적으로' 불러옵니다.
      // 이렇게 하면 html의 script 태그가 다 로드된 후에 실행됩니다.
      const { Live2DModel } = await import("pixi-live2d-display");

      // 2. 모델 로드
      const modelUrl = "/hiyori_free_en/runtime/hiyori_free_t08.model3.json";

      try {
        const model = await Live2DModel.from(modelUrl);

        model.x = app.screen.width / 2;
        model.y = app.screen.height / 2;
        model.anchor.set(0.5, 0.5);
        model.scale.set(0.25);

        model.on("hit", (hitAreas) => {
          if (hitAreas.includes("Body")) {
            model.motion("TapBody");
          }
        });

        app.stage.addChild(model as any);
        setModelLoaded(true);
        console.log("Model Loaded!");
      } catch (e) {
        console.error("모델 로드 실패:", e);
      }
    };

    loadLive2D();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {!modelLoaded && (
        <div style={{ position: "absolute", color: "black" }}>Loading...</div>
      )}
      <canvas ref={canvasRef} />
    </>
  );
}
