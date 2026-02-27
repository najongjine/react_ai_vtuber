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

// API 호출 실패 시 사용할 초기 더미 데이터 생성 함수
const generateInitialData = (basePrice = 2050.5) => {
  const data = [];
  let currentPrice = basePrice;
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    data.push({
      time: new Date(now.getTime() - i * 5000).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      price: Number(currentPrice.toFixed(2)),
    });
    currentPrice += Math.random() * 2 - 1;
  }
  return data;
};

const ChartPanel: React.FC = () => {
  const [data, setData] = useState(generateInitialData());
  const [isRealData, setIsRealData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 실제 금 가격을 가져오는 함수
    const fetchRealGoldPrice = async () => {
      try {
        // [주의] 완전 무료/무인증 실시간 금 API가 제한적이므로 우회 경로(allorigins proxy) 및 metals-api 데모키 사용.
        // 실 서비스 적용 시 본인의 API Key 발급이 필요합니다.
        const response = await fetch(
          "https://api.allorigins.win/get?url=" +
            encodeURIComponent(
              "https://metals-api.com/api/latest?access_key=demo&base=USD&symbols=XAU",
            ),
        );

        if (!response.ok) throw new Error("네트워크 응답이 올바르지 않습니다.");

        const json = await response.json();
        const parsedData = JSON.parse(json.contents);

        // 데이터 파싱 (금 1온스당 USD 가격 추출)
        const realPrice = parsedData?.rates?.XAU
          ? 1 / parsedData.rates.XAU
          : null;

        if (realPrice) {
          setIsRealData(true);
          setErrorMsg(null);

          setData((prevData) => {
            const now = new Date();
            const newPoint = {
              time: now.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              price: Number(realPrice.toFixed(2)),
            };
            return [...prevData.slice(1), newPoint];
          });
          return true; // 성공
        } else {
          throw new Error("유효하지 않은 데이터 형식입니다.");
        }
      } catch (error: any) {
        console.warn("Real API fetch failed, falling back to mock:", error);
        setErrorMsg("API 호출 실패 (요청 제한 등). 모의 데이터를 표시합니다.");
        setIsRealData(false);
        return false; // 실패
      }
    };

    // 1. 처음 마운트 시 한번 즉시 시도
    fetchRealGoldPrice().then((success) => {
      if (!success) {
        setData(generateInitialData(2050.5));
      }
    });

    // 2. 5초마다 갱신 주기
    const interval = setInterval(async () => {
      const success = await fetchRealGoldPrice();

      // 실제 API 통신 실패 시 모의 데이터로 자연스럽게 이어나가기
      if (!success) {
        setData((prevData) => {
          const lastPrice = prevData[prevData.length - 1].price;
          const newPrice = lastPrice + (Math.random() * 2 - 1);
          const now = new Date();
          const newPoint = {
            time: now.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            price: Number(newPrice.toFixed(2)),
          };
          return [...prevData.slice(1), newPoint];
        });
      }
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h3
          style={{
            color: "#333",
            margin: "0",
            fontSize: "1.2rem",
            fontWeight: "bold",
          }}
        >
          💰 실시간 금 가격
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: isRealData ? "#e6f4ea" : "#fce8e6",
              color: isRealData ? "#1e8e3e" : "#d93025",
              fontWeight: "bold",
            }}
          >
            {isRealData ? "🟢 Live API Data" : "🔴 Mock Data (Fallback)"}
          </span>
          {errorMsg && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#888",
                marginTop: "4px",
                maxWidth: "150px",
                textAlign: "right",
              }}
            >
              {errorMsg}
            </span>
          )}
        </div>
      </div>

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
