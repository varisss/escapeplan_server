import "./App.css";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "react-bootstrap";

function App() {
  const [connected, setConnected] = useState("");
  const [inGame, setInGame] = useState("");
  // const resetScores = async () => {
  //   await axios.get("http://localhost:5000/api/resetScores");
  //   return;
  // };
  const resetGame = async () => {
    console.log("reset pressed");
    const a = await axios.get("http://localhost:5000/api/resetGame");
    setConnected(a.data.connected);
    setInGame(a.data.inGame);
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
      <h1 className='game-title'>ESCAPE PLAN</h1>
      <div className='stats'>
        <div className='card'>
          <h1 className='connected'>Connected</h1>
          <h2>{connected}</h2>
        </div>
        <div className='card'>
          <h1 className='in-game'>In Game</h1>
          <h2>{inGame}</h2>
        </div>
      </div>

      <Button
        onClick={() => resetGame()}
        style={{ fontSize: "36px" }}
        className='button'
      >
        Reset Game
      </Button>
    </div>
  );
}

export default App;
