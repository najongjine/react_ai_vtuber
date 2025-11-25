import React, { useEffect, useRef, useState } from "react";

/** ===== 기본 설정 ===== */
const COLS = 55; // 가로 칸 수 (너가 올린 코드 유지)
const ROWS = 35; // 세로 칸 수
const CELL = 25; // 셀 픽셀 크기
const PADDING = 8; // 캔버스 여백

type Cell = {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
};

function makeGrid(cols: number, rows: number): Cell[] {
  const grid: Cell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      grid.push({
        x,
        y,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      });
    }
  }
  return grid;
}
const idx = (x: number, y: number) => y * COLS + x;

function neighbors(x: number, y: number) {
  const ns: [number, number, keyof Cell["walls"]][] = [
    [x, y - 1, "top"],
    [x + 1, y, "right"],
    [x, y + 1, "bottom"],
    [x - 1, y, "left"],
  ];
  return ns.filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS);
}
function carve(a: Cell, b: Cell) {
  if (b.y === a.y - 1) {
    a.walls.top = false;
    b.walls.bottom = false;
  }
  if (b.x === a.x + 1) {
    a.walls.right = false;
    b.walls.left = false;
  }
  if (b.y === a.y + 1) {
    a.walls.bottom = false;
    b.walls.top = false;
  }
  if (b.x === a.x - 1) {
    a.walls.left = false;
    b.walls.right = false;
  }
}
/** 깊이우선(백트래킹) 미로 생성 */
function generateMaze(): Cell[] {
  const grid = makeGrid(COLS, ROWS);
  const stack: Cell[] = [];
  let current = grid[0];
  current.visited = true;
  stack.push(current);
  while (stack.length) {
    current = stack[stack.length - 1];
    const choices = neighbors(current.x, current.y)
      .map(([nx, ny]) => grid[idx(nx, ny)])
      .filter((c) => !c.visited);
    if (choices.length === 0) {
      stack.pop();
      continue;
    }
    const next = choices[Math.floor(Math.random() * choices.length)];
    carve(current, next);
    next.visited = true;
    stack.push(next);
  }
  grid.forEach((c) => (c.visited = false));
  return grid;
}

/** ===== Q-러닝 보강 ===== */
const ACTIONS = 4; // 0:Up,1:Right,2:Down,3:Left
const UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3;

function allowedActionsFromCell(c: Cell) {
  const a: number[] = [];
  if (!c.walls.top) a.push(UP);
  if (!c.walls.right) a.push(RIGHT);
  if (!c.walls.bottom) a.push(DOWN);
  if (!c.walls.left) a.push(LEFT);
  return a;
}
// 1차원 Q테이블: (stateIndex*4 + action)
const qIndex = (s: number, a: number) => s * ACTIONS + a;

export default function MazeRL() {
  const [stepMs, setStepMs] = useState(140); // 1칸 이동당 ms (느리게 = 큰 값)
  const speedRef = useRef(stepMs);
  useEffect(() => {
    speedRef.current = stepMs;
  }, [stepMs]);

  const [grid, setGrid] = useState<Cell[]>(() => generateMaze());
  const [player, setPlayer] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [goal] = useState<{ x: number; y: number }>({
    x: COLS - 1,
    y: ROWS - 1,
  });
  const [episodesDone, setEpisodesDone] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const [epsilon, setEpsilon] = useState(0.1); // 실행 시 탐험 비율(학습 후 디버깅용)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Q 테이블 (렌더와 무관해야 하므로 ref에 보관)
  const qRef = useRef<Float32Array>(new Float32Array(COLS * ROWS * ACTIONS));

  const reshuffle = () => {
    // 미로를 바꾸면 Q는 무효. 초기화 권장.
    setGrid(generateMaze());
    setPlayer({ x: 0, y: 0 });
    qRef.current = new Float32Array(COLS * ROWS * ACTIONS);
    setEpisodesDone(0);
  };
  const resetQ = () => {
    qRef.current = new Float32Array(COLS * ROWS * ACTIONS);
    setEpisodesDone(0);
  };

  /** === 그리기 === */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const w = COLS * CELL + PADDING * 2;
    const h = ROWS * CELL + PADDING * 2;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);

    // 배경
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, w, h);

    // 셀
    for (const c of grid) {
      const sx = PADDING + c.x * CELL;
      const sy = PADDING + c.y * CELL;
      ctx.fillStyle = "#1a2238";
      ctx.fillRect(sx, sy, CELL, CELL);
    }
    // 벽
    ctx.strokeStyle = "#9aa4c9";
    ctx.lineWidth = 2;
    for (const c of grid) {
      const sx = PADDING + c.x * CELL;
      const sy = PADDING + c.y * CELL;
      if (c.walls.top) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + CELL, sy);
        ctx.stroke();
      }
      if (c.walls.right) {
        ctx.beginPath();
        ctx.moveTo(sx + CELL, sy);
        ctx.lineTo(sx + CELL, sy + CELL);
        ctx.stroke();
      }
      if (c.walls.bottom) {
        ctx.beginPath();
        ctx.moveTo(sx, sy + CELL);
        ctx.lineTo(sx + CELL, sy + CELL);
        ctx.stroke();
      }
      if (c.walls.left) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + CELL);
        ctx.stroke();
      }
    }
    // 목표
    {
      const gx = PADDING + goal.x * CELL + CELL / 2;
      const gy = PADDING + goal.y * CELL + CELL / 2;
      ctx.beginPath();
      ctx.fillStyle = "#3ddc84";
      ctx.arc(gx, gy, CELL * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    // 플레이어
    {
      const px = PADDING + player.x * CELL + CELL / 2;
      const py = PADDING + player.y * CELL + CELL / 2;
      ctx.beginPath();
      ctx.fillStyle = "#ffd166";
      ctx.arc(px, py, CELL * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [grid, player, goal]);

  /** === Q-러닝 학습 === */
  const train = (
    episodes = 2000,
    opts?: {
      alpha?: number;
      gamma?: number;
      epsStart?: number;
      epsEnd?: number;
      maxSteps?: number;
    }
  ) => {
    const alpha = opts?.alpha ?? 0.2;
    const gamma = opts?.gamma ?? 0.95;
    const epsStart = opts?.epsStart ?? 0.9;
    const epsEnd = opts?.epsEnd ?? 0.05;
    const maxSteps = opts?.maxSteps ?? COLS * ROWS * 4;

    const q = qRef.current;
    const goalIdx = idx(goal.x, goal.y);

    for (let ep = 0; ep < episodes; ep++) {
      let x = 0,
        y = 0; // 시작점 고정
      const eps =
        epsStart + (epsEnd - epsStart) * (ep / Math.max(1, episodes - 1));

      for (let t = 0; t < maxSteps; t++) {
        const s = idx(x, y);
        const c = grid[s];
        const acts = allowedActionsFromCell(c);

        // ε-탐욕 행동 선택
        let a: number;
        if (Math.random() < eps) {
          a = acts[(Math.random() * acts.length) | 0];
        } else {
          // 허용 행동 중 Q가 최대인 것 선택
          let bestA = acts[0],
            bestQ = q[qIndex(s, acts[0])];
          for (let i = 1; i < acts.length; i++) {
            const aa = acts[i];
            const qq = q[qIndex(s, aa)];
            if (qq > bestQ) {
              bestQ = qq;
              bestA = aa;
            }
          }
          a = bestA;
        }

        // 전이
        let nx = x,
          ny = y;
        if (a === UP) ny--;
        else if (a === RIGHT) nx++;
        else if (a === DOWN) ny++;
        else if (a === LEFT) nx--;

        const ns = idx(nx, ny);
        const done = ns === goalIdx;
        const reward = done ? 1 : -0.01; // 한 칸당 작은 벌점

        // 다음 상태에서의 최대 Q
        let maxNextQ = 0;
        if (!done) {
          const na = allowedActionsFromCell(grid[ns]);
          maxNextQ = na.reduce(
            (m, aa) => Math.max(m, q[qIndex(ns, aa)]),
            -Infinity
          );
        }

        // Q 업데이트
        const oldQ = q[qIndex(s, a)];
        const target = reward + (done ? 0 : gamma * maxNextQ);
        q[qIndex(s, a)] = oldQ + alpha * (target - oldQ);

        x = nx;
        y = ny;
        if (done) break;
      }
    }
    setEpisodesDone((v) => v + episodes);
  };

  /** === 학습된 정책 따라가기(애니메이션) === */
  const runPolicy = () => {
    if (isAuto) return;
    setIsAuto(true);
    let x = 0,
      y = 0;
    setPlayer({ x, y });

    const q = qRef.current;
    const goalIdx = idx(goal.x, goal.y);
    let steps = 0,
      limit = COLS * ROWS * 4;

    const tick = () => {
      if (idx(x, y) === goalIdx || steps++ > limit) {
        setIsAuto(false);
        return;
      }
      // (옵션) 약간의 탐험 허용
      const c = grid[idx(x, y)];
      const acts = allowedActionsFromCell(c);

      let a: number;
      if (Math.random() < epsilon) {
        a = acts[(Math.random() * acts.length) | 0];
      } else {
        // 허용 행동 중 Q 최대
        let bestA = acts[0],
          bestQ = q[qIndex(idx(x, y), acts[0])];
        for (let i = 1; i < acts.length; i++) {
          const aa = acts[i];
          const qq = q[qIndex(idx(x, y), aa)];
          if (qq > bestQ) {
            bestQ = qq;
            bestA = aa;
          }
        }
        a = bestA;
      }

      if (a === UP) y--;
      else if (a === RIGHT) x++;
      else if (a === DOWN) y++;
      else if (a === LEFT) x--;

      setPlayer({ x, y });
      timerRef.current = window.setTimeout(tick, speedRef.current);
    };
    tick();
  };
  const stopRun = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsAuto(false);
  };

  // 목표 도달 시 자동 멈춤 + 새 미로는 수동으로
  useEffect(() => {
    if (player.x === goal.x && player.y === goal.y && isAuto) {
      stopRun();
      alert("🎉 도착!");
    }
  }, [player, goal, isAuto]);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
      <canvas
        ref={canvasRef}
        style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}
      />
      <div
        style={{
          fontFamily: "ui-sans-serif, system-ui",
          lineHeight: 1.6,
          minWidth: 280,
        }}
      >
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          속도(ms/칸)
          <input
            type="range"
            min={30}
            max={600}
            step={10}
            value={stepMs}
            onChange={(e) => setStepMs(parseInt(e.target.value))}
            style={{ width: 160 }}
          />
          <span>{stepMs}ms</span>
        </label>

        <h2 style={{ margin: 0 }}>React 2D 미로 + Q-Learning</h2>
        <p style={{ marginTop: 8 }}>“Train → Run Policy” 순서로 눌러보세요.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => train(2000)} disabled={isAuto}>
            🏋️ Train 2000
          </button>
          <button
            onClick={() => train(10000, { epsStart: 0.9, epsEnd: 0.01 })}
            disabled={isAuto}
          >
            🏋️💨 Train 10000
          </button>
          <button onClick={resetQ} disabled={isAuto}>
            🧹 Reset Q
          </button>
          <button onClick={reshuffle} disabled={isAuto}>
            🔁 새 미로
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={runPolicy} disabled={isAuto}>
            ▶️ Run Policy
          </button>
          <button onClick={stopRun} disabled={!isAuto}>
            ⏹ Stop
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div>
            Episodes done: <b>{episodesDone.toLocaleString()}</b>
          </div>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 6,
            }}
          >
            ε(실행 시 탐험)
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value))}
              style={{ width: 140 }}
            />
            <span>{epsilon.toFixed(2)}</span>
          </label>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            <li>보상: 도착 +1, 그 외 −0.01 (짧은 경로 유도)</li>
            <li>학습 파라미터: α=0.2, γ=0.95, ε 0.9→0.05 선형 감소</li>
            <li>미로가 바뀌면 Q 초기화 권장</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
