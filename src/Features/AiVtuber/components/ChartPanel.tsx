import React from "react";

const ChartPanel: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: "15vw",
        right: "150px",
        top: "100px",
        bottom: "250px",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(5px)",
        borderRadius: "20px",
        border: "2px dashed #aaa",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
        boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
      }}
    >
      <h3 style={{ color: "#555", marginBottom: "10px" }}>차트 영역</h3>
      <p style={{ color: "#777", fontSize: "14px" }}>
        여기에 차트 컴포넌트를 추가하세요
      </p>
    </div>
  );
};

export default ChartPanel;
