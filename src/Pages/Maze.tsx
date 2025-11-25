// src/components/Maze.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** ===== 기본 설정 ===== */
const COLS = 75; // 가로 칸 수
const ROWS = 55; // 세로 칸 수
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

/** 깊이우선(백트래킹) 미로 생성: “완전 미로(사이클 적고 길 1개)” */
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

  // 방문 플래그 초기화(사용 안 하니 정리)
  grid.forEach((c) => (c.visited = false));
  return grid;
}

/** ─────────────────────────────────────────────────────────────
 * 유틸: 현재 셀에서 (nx,ny)로 이동 가능한지 체크
 * ────────────────────────────────────────────────────────────*/
function canMove(grid: Cell[], x: number, y: number, nx: number, ny: number) {
  const c = grid[idx(x, y)];
  if (nx === x && ny === y - 1) return !c.walls.top;
  if (nx === x + 1 && ny === y) return !c.walls.right;
  if (nx === x && ny === y + 1) return !c.walls.bottom;
  if (nx === x - 1 && ny === y) return !c.walls.left;
  return false;
}

/** ─────────────────────────────────────────────────────────────
 * 맨해튼 휴리스틱
 * ────────────────────────────────────────────────────────────*/
const H = (x: number, y: number, gx: number, gy: number) =>
  Math.abs(x - gx) + Math.abs(y - gy);

/** ============================================================
 * =======================  A* 시작  ===========================
 * - 입력: grid, 시작 좌표(start), 목표 좌표(goal)
 * - 출력: 시작→목표의 최단 경로(좌표 배열) / 없으면 빈 배열
 * ============================================================*/
function astar(
  grid: Cell[],
  start: { x: number; y: number },
  goal: { x: number; y: number }
): { x: number; y: number }[] {
  const key = (x: number, y: number) => `${x},${y}`;

  const openSet = new Set<string>([key(start.x, start.y)]);
  const cameFrom = new Map<string, string>(); // childKey -> parentKey

  // g: 시작에서 현재까지 실제 비용, f: g + h
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      gScore.set(key(x, y), Infinity);
      fScore.set(key(x, y), Infinity);
    }
  }
  gScore.set(key(start.x, start.y), 0);
  fScore.set(key(start.x, start.y), H(start.x, start.y, goal.x, goal.y));

  const getLowestF = () => {
    let bestK = "";
    let bestV = Infinity;
    for (const k of openSet) {
      const v = fScore.get(k)!;
      if (v < bestV) {
        bestV = v;
        bestK = k;
      }
    }
    return bestK;
  };

  while (openSet.size > 0) {
    const currentK = getLowestF();
    const [cx, cy] = currentK.split(",").map(Number);
    if (cx === goal.x && cy === goal.y) {
      // 경로 재구성
      const path: { x: number; y: number }[] = [{ x: cx, y: cy }];
      let ck = currentK;
      while (cameFrom.has(ck)) {
        ck = cameFrom.get(ck)!;
        const [px, py] = ck.split(",").map(Number);
        path.push({ x: px, y: py });
      }
      path.reverse();
      return path;
    }

    openSet.delete(currentK);

    // 현재에서 이동 가능한 이웃만
    for (const [nx, ny] of neighbors(cx, cy).map(
      ([nx, ny]) => [nx, ny] as const
    )) {
      if (!canMove(grid, cx, cy, nx, ny)) continue;

      const nk = key(nx, ny);
      const tentative = gScore.get(currentK)! + 1; // 격자 간선 비용 = 1

      if (tentative < gScore.get(nk)!) {
        cameFrom.set(nk, currentK);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + H(nx, ny, goal.x, goal.y));
        if (!openSet.has(nk)) openSet.add(nk);
      }
    }
  }

  // 경로 없음
  return [];
}
/** =======================  A* 끝  ===========================
 * ============================================================*/

const Maze: React.FC = () => {
  const [grid, setGrid] = useState<Cell[]>(() => generateMaze());
  const [player, setPlayer] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [goal] = useState<{ x: number; y: number }>({
    x: COLS - 1,
    y: ROWS - 1,
  });
  const [autoPath, setAutoPath] = useState<{ x: number; y: number }[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 다시 섞기 버튼
  const reshuffle = () => {
    setGrid(generateMaze());
    setPlayer({ x: 0, y: 0 });
    setAutoPath([]);
    setAutoRun(false);
  };

  // 그리기
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

    // 셀 바닥
    for (const c of grid) {
      const sx = PADDING + c.x * CELL;
      const sy = PADDING + c.y * CELL;
      ctx.fillStyle = "#1a2238";
      ctx.fillRect(sx, sy, CELL, CELL);
    }

    // 벽 선
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

    // 경로(자동 길) 시각화
    if (autoPath.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#61dafb";
      for (let i = 0; i < autoPath.length; i++) {
        const { x, y } = autoPath[i]!;
        const px = PADDING + x * CELL + CELL / 2;
        const py = PADDING + y * CELL + CELL / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 목표
    {
      const gx = PADDING + goal.x * CELL + CELL / 2;
      const gy = PADDING + goal.y * CELL + CELL / 2;
      ctx.beginPath();
      ctx.fillStyle = "#3ddc84"; // 목표(출구)
      ctx.arc(gx, gy, CELL * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // 플레이어
    {
      const px = PADDING + player.x * CELL + CELL / 2;
      const py = PADDING + player.y * CELL + CELL / 2;
      ctx.beginPath();
      ctx.fillStyle = "#ffd166"; // 쥐(플레이어)
      ctx.arc(px, py, CELL * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [grid, player, goal, autoPath]);

  // 키보드 수동 이동
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (autoRun) return; // 자동 주행 중엔 수동 입력 무시(원하면 제거)
      const c = grid[idx(player.x, player.y)];
      let nx = player.x,
        ny = player.y;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        if (!c.walls.top) ny--;
      }
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        if (!c.walls.right) nx++;
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        if (!c.walls.bottom) ny++;
      }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        if (!c.walls.left) nx--;
      }
      if (nx !== player.x || ny !== player.y) setPlayer({ x: nx, y: ny });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grid, player, autoRun]);

  // 자동 주행(A*) 실행 트리거
  const runAStar = () => {
    const path = astar(grid, player, goal);
    setAutoPath(path);
    setAutoRun(true);
  };

  // 자동 주행 애니메이션
  useEffect(() => {
    if (!autoRun || autoPath.length === 0) return;
    let i = 0;
    const tid = setInterval(() => {
      i++;
      if (i >= autoPath.length) {
        setAutoRun(false);
        clearInterval(tid);
        return;
      }
      setPlayer(autoPath[i]!);
    }, 60); // 속도 조절
    return () => clearInterval(tid);
  }, [autoRun, autoPath]);

  // 클리어 체크
  useEffect(() => {
    if (player.x === goal.x && player.y === goal.y) {
      setTimeout(() => {
        alert("🎉 클리어! 새 미로를 시작합니다.");
        reshuffle();
      }, 10);
    }
  }, [player, goal]);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
      <canvas
        ref={canvasRef}
        style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}
      />
      <div style={{ fontFamily: "ui-sans-serif, system-ui", lineHeight: 1.6 }}>
        <h2 style={{ margin: 0 }}>React 2D 미로</h2>
        <p style={{ marginTop: 8 }}>
          방향키(또는 WASD)로 움직이거나, A*로 자동 탐색을 실행해 보세요.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={reshuffle}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccd",
              cursor: "pointer",
            }}
          >
            🔁 새 미로 만들기
          </button>
          <button
            onClick={runAStar}
            disabled={autoRun}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ccd",
              cursor: "pointer",
            }}
          >
            🤖 A* 자동 탐색
          </button>
        </div>
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          <li>COLS/ROWS, CELL 값으로 난이도 조절</li>
          <li>경로는 하늘색 선으로 시각화</li>
          <li>A* 구현부는 “A* 시작/끝” 주석을 참고</li>
        </ul>
      </div>
    </div>
  );
};

export default Maze;
