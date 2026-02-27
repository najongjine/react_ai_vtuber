import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 2초마다 갱신될 초기 더미 데이터 생성 (가상의 금 가격, 최근 20개 저장)
const generateInitialData = () => {
  const data = [];
  let currentPrice = 2050.5; // 기준 시작가
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    data.push({
      time: new Date(now.getTime() - i * 2000).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      price: Number(currentPrice.toFixed(2)),
    });
    currentPrice += Math.random() * 4 - 2; // -2 ~ +2 변동
  }
  return data;
};

const ChartPanel: React.FC = () => {
  const [data, setData] = useState(generateInitialData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) => {
        const lastPrice = prevData[prevData.length - 1].price;
        const newPrice = lastPrice + (Math.random() * 4 - 2); // 랜덤 변동
        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          price: Number(newPrice.toFixed(2)),
        };

        // 최신 데이터 1개를 추가하고 가장 오래된 데이터 1개를 버립니다. (20개 유지)
        return [...prevData.slice(1), newPoint];
      });
    }, 5000); // 5초 주기

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: "15vw",
        right: "150px",
        top: "100px",
        bottom: "250px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(5px)",
        borderRadius: "20px",
        border: "1px solid #e0e0e0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
      }}
    >
      <h3
        style={{
          color: "#333",
          margin: "0 0 15px 0",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        💰 실시간 금 가격 (Mock Data)
      </h3>

      {/* 차트를 부모 div 크기에 맞추기 위한 래퍼 */}
      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#888" }}
              tickMargin={10}
              axisLine={{ stroke: "#ddd" }}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(value) => `$${value.toFixed(1)}`}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              itemStyle={{ color: "#d4af37", fontWeight: "bold" }}
              formatter={(value: any) => {
                const numericValue = Number(value) || 0;
                return [`$${numericValue.toFixed(2)}`, "Price"];
              }}
              labelStyle={{ color: "#666", marginBottom: "4px" }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#ffd700" /* 골드 색상 */
              strokeWidth={3}
              dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#ffd700" }}
              activeDot={{
                r: 6,
                fill: "#ffaa00",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              animationDuration={500}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartPanel;
