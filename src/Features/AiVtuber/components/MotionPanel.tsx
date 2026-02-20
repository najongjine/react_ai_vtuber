import React from "react";
import { MaoMotionKey } from "../utils/constants";

interface MotionPanelProps {
    onMotionClick: (key: MaoMotionKey) => void;
    onExpressionClick: (id: string) => void;
}

const MotionPanel: React.FC<MotionPanelProps> = ({
    onMotionClick,
    onExpressionClick,
}) => {
    return (
        <div
            style={{
                padding: "10px",
                borderBottom: "1px solid #ddd",
                backgroundColor: "rgba(255,255,255,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
            }}
        >
            {/* Body Motions */}
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>
                Body Motions (모션)
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "5px",
                }}
            >
                <button
                    onClick={() => onMotionClick("SPECIAL_HEART")}
                    style={btnStyle}
                    title="special_01: 하트/폭발"
                >
                    ❤️ 하트
                </button>
                <button
                    onClick={() => onMotionClick("SPECIAL_RABBIT_MAGIC")}
                    style={btnStyle}
                    title="special_03: 토끼 마술"
                >
                    🐰 마술
                </button>
                <button
                    onClick={() => onMotionClick("SPECIAL_RABBIT_AURA")}
                    style={btnStyle}
                    title="special_02: 토끼 오라"
                >
                    ✨ 오라
                </button>
                <button
                    onClick={() => onMotionClick("TAP_BODY_1")}
                    style={btnStyle}
                    title="mtn_02: 터치 1"
                >
                    👆 터치1
                </button>
                <button
                    onClick={() => onMotionClick("TAP_BODY_2")}
                    style={btnStyle}
                    title="mtn_03: 터치 2"
                >
                    ✌️ 터치2
                </button>
                <button
                    onClick={() => onMotionClick("TAP_BODY_3")}
                    style={btnStyle}
                    title="mtn_04: 터치 3"
                >
                    👋 터치3
                </button>
            </div>

            {/* Expressions */}
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>
                Expressions (표정)
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "5px",
                }}
            >
                <button
                    onClick={() => onExpressionClick("exp_01")}
                    style={btnStyle}
                    title="Normal: 눈 뜸"
                >
                    😐 기본
                </button>
                <button
                    onClick={() => onExpressionClick("exp_02")}
                    style={btnStyle}
                    title="Smile: 웃음"
                >
                    😄 웃음
                </button>
                <button
                    onClick={() => onExpressionClick("exp_03")}
                    style={btnStyle}
                    title="Closed Eyes: 눈 감음"
                >
                    😌 눈감음
                </button>
            </div>
        </div>
    );
};

// Button Style
const btnStyle: React.CSSProperties = {
    padding: "8px",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: "5px",
    cursor: "pointer",
    textAlign: "center" as const,
    fontWeight: "bold",
    fontSize: "13px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    whiteSpace: "nowrap",
};

export default MotionPanel;
