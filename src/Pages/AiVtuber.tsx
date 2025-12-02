// src/components/Header.tsx

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Live2DViewerCompo from "../Component/Live2DViewerCompo";

const AiVtuber: React.FC = () => {
  const mode = import.meta.env.MODE;
  return (
    <div className="">
      <h1>AI Vtuber</h1>
      <div>
        <Live2DViewerCompo />
      </div>
    </div>
  );
};

export default AiVtuber;
