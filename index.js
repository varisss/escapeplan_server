var cors = require("cors");
const app = require("express")();
const server = require("http").createServer(app);

app.use(cors());

const port = process.env.PORT || 5000;
server.listen(port, function () {
  console.log(`listening on port ${port}`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

let gridArray = [
  [1, 1, 1, 1, 1],
  [2, 3, 4, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

let warderTurn = true;
let connectedCount = 0;
let inGameIds = [];
let players = [];
let gameRunning = false;
let startingId;
let maxRounds = null;
let round;

try {
  io.on("connection", (socket) => {
    connectedCount = socket.client.conn.server.clientsCount;

    socket.on("joinLobby", () => {
      if (maxRounds !== null) {
        io.to(socket.id).emit("roundsSet", maxRounds);
        return;
      }
      io.to(socket.id).emit("roundsNotSet");
      return;
    });

    socket.on("joinGame", (nickname, rounds) => {
      if (inGameIds.length === 2) {
        //game full
        io.to(socket.id).emit("gameFull");
        return;
      }
      let player = {
        name: nickname,
        id: socket.id,
        role: "",
        pos_x: 0,
        pos_y: 0,
        score: 0,
        ready: true,
      };
      players.push(player);
      inGameIds.push(socket.id);
      if (inGameIds.length === 1) {
        round = 1;
        maxRounds = rounds;
      }
      if (inGameIds.length === 2) {
        startGame();
      }
    });

    socket.on("startNewRound", () => {
      if (players.length !== 0) {
        players.find((player) => player.id === socket.id).ready = true;
        if (players[0].ready && players[1].ready) {
          startNewRound();
        }
      }
    });

    socket.on("move", (direction) => {
      move(direction, socket.id, socket);
    });

    socket.on("surrender", () => {
      surrender(socket.id);
    });

    socket.on("message", ({ name, message, id }) => {
      io.emit("message", { name, message, id });
    });

    socket.on("emoji", (emoji) => {
      displayEmoji(socket.id, emoji);
    });

    socket.on("leaveGame", () => {
      //a player left
      const j = inGameIds.indexOf(socket.id);
      if (j === -1) return;
      inGameIds.splice(j, 1);
      for (let i in players) {
        if (players[i].id === socket.id) {
          players.splice(i, 1);
        }
      }
      players.length !== 0 && io.to(players[0].id).emit("opponentLeft");
      round = 1;
      if (players.length === 0) maxRounds = null;
      resetScores();
      stopTimer();
    });

    socket.on("disconnect", function () {
      connectedCount = socket.client.conn.server.clientsCount;
      const j = inGameIds.indexOf(socket.id);
      if (j === -1) return;
      inGameIds.splice(j, 1);
      for (let i in players) {
        if (players[i].id === socket.id) {
          players.splice(i, 1);
        }
      }
      players.length !== 0 && io.to(players[0].id).emit("opponentLeft");
      round = 1;
      if (players.length === 0) maxRounds = null;
      resetScores();
      stopTimer();
    });
  });

  const randomGrid = (gridArray) => {
    const array = [].concat(...gridArray);
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    let newGridArray = [];
    while (array.length) newGridArray.push(array.splice(0, 5));

    return newGridArray;
  };

  const setRoles = () => {
    if (Math.random < 0.5) {
      players[0].role = "warder";
      players[1].role = "prisoner";
    } else {
      players[0].role = "prisoner";
      players[1].role = "warder";
    }
  };

  const setPositions = () => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (gridArray[i][j] === 3) {
          players.find((player) => player.role === "warder").pos_x = i;
          players.find((player) => player.role === "warder").pos_y = j;
        }
        if (gridArray[i][j] === 4) {
          players.find((player) => player.role === "prisoner").pos_x = i;
          players.find((player) => player.role === "prisoner").pos_y = j;
        }
      }
    }
  };

  const startGame = (isWarderStart = true) => {
    io.emit("timer", 10);
    const newGrid = randomGrid(gridArray);
    gridArray = newGrid;
    setRoles();
    setPositions();
    warderTurn = isWarderStart;
    gameRunning = true;
    io.emit("initializeRole", players);
    io.emit("newGrid", newGrid, warderTurn);
    io.emit("startRound");
    startTimer();
  };

  const startNewRound = () => {
    const isWarderStart =
      players.find((player) => player.id === startingId).role === "warder";
    startGame(isWarderStart);
  };

  const toggleTurn = () => {
    stopTimer();
    warderTurn = !warderTurn;
    //notify both clients that the new round starts. will have to send warderTurn
    startTimer();
  };

  let interval;
  const startTimer = () => {
    let timer = 9;
    interval = setInterval(() => {
      io.emit("timer", timer);
      if (timer === 0) {
        //when timer reached 0, toggle turn
        toggleTurn();
        io.sockets.emit("newGrid", gridArray, warderTurn);
      }
      timer--;
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(interval);
  };

  const move = (direction, id, socket) => {
    if (!gameRunning) {
      return;
    }
    const currentPlayer = players.find((player) => player.id === id);

    if (
      !(
        (currentPlayer.role === "warder" && warderTurn) ||
        (currentPlayer.role === "prisoner" && !warderTurn)
      )
    ) {
      return;
    }

    let new_x = currentPlayer.pos_x;
    let new_y = currentPlayer.pos_y;
    switch (direction) {
      case "left":
        new_y = new_y - 1;
        break;
      case "right":
        new_y = new_y + 1;
        break;
      case "up":
        new_x = new_x - 1;
        break;
      case "down":
        new_x = new_x + 1;
        break;
      default:
        return;
    }

    //check if new pos is within the grid
    if (new_x >= 0 && new_x <= 4 && new_y >= 0 && new_y <= 4) {
      if (currentPlayer.role === "warder" && warderTurn) {
        if (gridArray[new_x][new_y] === 4) {
          io.emit("timer", 10);
          toggleTurn();
          warderWins();
        } else if (gridArray[new_x][new_y] === 0) {
          io.emit("timer", 10);
          //if new position is a freeblock
          gridArray[currentPlayer.pos_x][currentPlayer.pos_y] = 0;
          gridArray[new_x][new_y] = 3;
          players.find((player) => player.id === id).pos_x = new_x;
          players.find((player) => player.id === id).pos_y = new_y;
          toggleTurn();
          io.sockets.emit("newGrid", gridArray, warderTurn);
        }
      } else if (currentPlayer.role === "prisoner" && !warderTurn) {
        io.emit("timer", 10);
        if (gridArray[new_x][new_y] === 2) {
          toggleTurn();
          prisonerWins();
        } else if (gridArray[new_x][new_y] === 3) {
          toggleTurn();
          warderWins();
        } else if (gridArray[new_x][new_y] === 0) {
          gridArray[currentPlayer.pos_x][currentPlayer.pos_y] = 0;
          gridArray[new_x][new_y] = 4;
          players.find((player) => player.id === id).pos_x = new_x;
          players.find((player) => player.id === id).pos_y = new_y;
          toggleTurn();
          io.sockets.emit("newGrid", gridArray, warderTurn);
        }
      } else {
        console.log("invalid role");
        return;
      }
    }
  };

  const warderWins = () => {
    stopTimer();
    io.emit("clearTimer");
    //warder score + 1
    players.find((player) => player.role === "warder").score += 1;
    io.sockets.emit("warderWins", players);
    gameRunning = false;
    players[0].ready = false;
    players[1].ready = false;
    startingId = players.find((player) => player.role === "warder").id;
    round++;
    if (round > maxRounds) {
      //game over
      io.emit("gameOver");
    }
  };

  const prisonerWins = () => {
    stopTimer();
    io.emit("clearTimer");
    //prisoner score +1
    players.find((player) => player.role === "prisoner").score += 1;
    io.sockets.emit("prisonerWins", players);
    gameRunning = false;
    players[0].ready = false;
    players[1].ready = false;
    startingId = players.find((player) => player.role === "prisoner").id;
    round++;
    if (round > maxRounds) {
      //game over
      io.emit("gameOver");
    }
  };

  const surrender = (id) => {
    if (!gameRunning) {
      return;
    }
    const currentPlayer = players.find((player) => player.id === id);
    if (currentPlayer.role === "warder") {
      toggleTurn();
      prisonerWins();
      return;
    } else if (currentPlayer.role === "prisoner") {
      toggleTurn();
      warderWins();
      return;
    }
  };

  const displayEmoji = (id, emoji) => {
    const receiverId = players.find((player) => player.id !== id).id;
    io.to(receiverId).emit("receiveEmoji", emoji);
  };

  const resetScores = () => {
    for (let i in players) {
      players[i].score = 0;
    }
    io.emit("setScores", players);
  };

  const resetGame = () => {
    io.emit("resetGame");
  };

  app.get("/", (req, res) =>
    res.send({ connected: connectedCount, inGame: inGameIds.length })
  );

  app.get("/api/resetGame", (req, res) => {
    resetGame();
    res.send({ connected: connectedCount, inGame: inGameIds.length });
  });
} catch (e) {
  console.log(e);
}
