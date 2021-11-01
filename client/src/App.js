import "./App.css";
import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [connected, setConnected] = useState("");
  const [inGame, setInGame] = useState("");
  // const resetScores = async () => {
  //   await axios.get("http://localhost:5000/api/resetScores");
  //   return;
  // };
  const resetGame = async () => {
    await axios.get("http://localhost:5000/api/resetGame");
    return;
  };
  const fetchData = async () => {
    const a = await axios("http://localhost:5000/");
    setConnected(a.data.connected);
    setInGame(a.data.inGame);
  };
  useEffect(() => {
    fetchData();
  }, []);
  setInterval(() => {
    fetchData();
  }, 1000);
  return (
    <div className='container'>
      <h1>{`Connected: ${connected}`}</h1>
      <h1>{`In Game: ${inGame}`}</h1>
      <button onClick={() => resetGame()}>Reset Game</button>
    </div>
  );
}

export default App;
