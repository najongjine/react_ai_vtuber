import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home";
import Header from "./Component/Header";
import Footer from "./Component/Footer";
import Maze from "./Pages/Maze";
import MazeRL from "./Pages/MazeRL";

function App() {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/maze" element={<Maze />} />
          <Route path="/mazerl" element={<MazeRL />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </>
  );
}

export default App;
