import "./App.css";
import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [connected, setConnected] = useState("");
  const [inGame, setInGame] = useState("");
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
    <>
      <h1>{`Connected: ${connected}`}</h1>
      <h1>{`In Game: ${inGame}`}</h1>
    </>
  );
}

export default App;
