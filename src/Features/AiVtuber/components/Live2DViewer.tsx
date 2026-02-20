import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as PIXI from "pixi.js";
import {
    Live2DModel,
    MotionPreloadStrategy,
} from "pixi-live2d-display/cubism4";
import { MAO_MOTIONS, MaoMotionKey } from "../utils/constants";
import { Live2DController } from "../types";

// Expose PIXI to window for pixi-live2d-display
(window as any).PIXI = PIXI;

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
        const expressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        useImperativeHandle(ref, () => ({
            playMotion: (motionKey: any) => {
                if (!modelRef.current) return;
                const key = motionKey as MaoMotionKey;
                const motion = MAO_MOTIONS[key];
                if (!motion) return;

                console.log(`Playing Motion: ${key}`);
                // Ensure strictly typed group and index usage
                modelRef.current.motion(motion.group, motion.index, 3);
            },
            setExpression: (expressionId: string) => {
                if (!modelRef.current) return;

                // Reset existing timer if a new expression is set
                if (expressionTimeoutRef.current) {
                    clearTimeout(expressionTimeoutRef.current);
                    expressionTimeoutRef.current = null;
                }

                const internalModel = modelRef.current.internalModel as any;
                if (internalModel.motionManager && internalModel.motionManager.expressionManager) {
                    console.log(`Setting Expression: ${expressionId}`);
                    try {
                        internalModel.motionManager.expressionManager.setExpression(expressionId);

                        // Auto-revert to default expression (exp_01) after 5 seconds
                        if (expressionId !== "exp_01") {
                            expressionTimeoutRef.current = setTimeout(() => {
                                const currentModel = modelRef.current;
                                if (currentModel?.internalModel?.motionManager?.expressionManager) {
                                    console.log("Auto Reverting to Default Expression (exp_01)");
                                    (currentModel.internalModel as any).motionManager.expressionManager.setExpression("exp_01");
                                }
                                expressionTimeoutRef.current = null;
                            }, 5000);
                        }
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

        useEffect(() => {
            if (!canvasRef.current || appRef.current) return;

            const app = new PIXI.Application({
                view: canvasRef.current,
                resizeTo: window,
                transparent: true,
                backgroundAlpha: 0,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });
            appRef.current = app;

            const loadModel = async () => {
                try {
                    const model = await Live2DModel.from(modelUrl, {
                        motionPreload: MotionPreloadStrategy.ALL,
                        autoInteract: false,
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

                    if (internalModel.motionManager) {
                        console.log("Starting Idle Motion...");
                        internalModel.motionManager.startMotion("Idle", 0);
                    }

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

        // Look at pointer logic
        useEffect(() => {
            const handlePointerMove = (event: PointerEvent) => {
                if (!modelRef.current) return;

                const bounds = modelRef.current.getBounds();
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height * 0.2;

                const x = event.clientX - centerX;
                const y = event.clientY - centerY;

                modelRef.current.focus(x, y);
            };

            window.addEventListener("pointermove", handlePointerMove);
            return () => {
                window.removeEventListener("pointermove", handlePointerMove);
            };
        }, []);

        // Lip sync & Update loop
        useEffect(() => {
            if (!appRef.current) return;

            const tickerFn = () => {
                if (!modelRef.current) return;

                const internalModel = modelRef.current.internalModel as any;
                const coreModel = internalModel?.coreModel as any;
                const mouthIndex = mouthOpenParamIndexRef.current;

                if (!coreModel || mouthIndex === -1) return;

                if (isSpeaking) {
                    const mouthValue = Math.abs(Math.sin(Date.now() / 90)) * 0.8 + 0.2;
                    coreModel.setParameterValueByIndex(mouthIndex, mouthValue);
                }
            };

            const modelUpdateFn = (delta: number) => {
                if (modelRef.current) {
                    modelRef.current.update(appRef.current!.ticker.deltaMS);
                }
            };

            appRef.current.ticker.add(tickerFn);
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
