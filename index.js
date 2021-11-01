var cors = require("cors");
const app = require("express")();
const server = require("http").createServer(app);

app.use(cors());

server.listen(5000, function () {
  console.log("listening on port 5000");
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

io.on("connection", (socket) => {
  // inGameIds.push(socket.id);
  connectedCount = socket.client.conn.server.clientsCount;

  socket.on("joinGame", (nickname) => {
    // console.log(io.engine.clientsCount);
    if (inGameIds.length === 2) {
      console.log("full");
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
    console.log(players);
    inGameIds.push(socket.id);
    console.log(`number of clients ready: ${inGameIds.length}`);
    if (inGameIds.length === 2) {
      console.log(inGameIds);
      startGame();
    }
  });

  socket.on("message", ({ name, message, id }) => {
    console.log(id);
    io.emit("message", { name, message, id });
  });

  socket.on("startNewRound", () => {
    if (players.length !== 0) {
      players.find((player) => player.id === socket.id).ready = true;
      if (players[0].ready && players[1].ready) {
        startNewRound();
      }
    }
  });

  socket.on("disconnect", function () {
    connectedCount = socket.client.conn.server.clientsCount;
    console.log("Got disconnect!");
    const j = inGameIds.indexOf(socket.id);
    if (j === -1) return;
    inGameIds.splice(j, 1);
    console.log(inGameIds.length);
    console.log(inGameIds);
    for (let i in players) {
      if (players[i].id === socket.id) {
        players.splice(i, 1);
      }
    }
    players.length !== 0 && io.to(players[0].id).emit("opponentLeft");
    resetScores();
  });

  socket.on("leaveGame", () => {
    console.log("A player left");
    const j = inGameIds.indexOf(socket.id);
    if (j === -1) return;
    inGameIds.splice(j, 1);
    console.log(inGameIds.length);
    console.log(inGameIds);
    for (let i in players) {
      if (players[i].id === socket.id) {
        players.splice(i, 1);
      }
    }
    players.length !== 0 && io.to(players[0].id).emit("opponentLeft");
    resetScores();
  });

  socket.on("move", (direction) => {
    move(direction, socket.id, socket);
  });

  socket.on("surrender", () => {
    surrender(socket.id);
  });

  socket.on("emoji", (emoji) => {
    displayEmoji(socket.id, emoji);
  });
});

function randomGrid(gridArray) {
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
}

function setRoles() {
  if (Math.random < 0.5) {
    players[0].role = "warder";
    players[1].role = "prisoner";
  } else {
    players[0].role = "prisoner";
    players[1].role = "warder";
  }
}

function setPositions() {
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
}

function startGame(w = true) {
  const newGrid = randomGrid(gridArray);
  gridArray = newGrid;
  setRoles();
  setPositions();
  warderTurn = w;
  console.log(`warder will start next round: ${warderTurn}`);
  console.log(players);
  gameRunning = true;
  io.emit("initializeRole", players);
  io.emit("newGrid", newGrid);
  io.emit("startRound");
}

function startNewRound() {
  const isWarderStart =
    players.find((player) => player.id === startingId).role === "warder";
  console.log(`warder starts first: ${isWarderStart}`);
  startGame(isWarderStart);
}

function toggleTurn() {
  warderTurn = !warderTurn;
  console.log("toggleTurn");
  console.log(`warderTurn: ${warderTurn}`);
  //notify both clients that the new round starts. will have to send warderTurn
  console.log("restartTimer");
}

function move(direction, id, socket) {
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
  console.log(currentPlayer);
  let new_x = currentPlayer.pos_x;
  let new_y = currentPlayer.pos_y;
  console.log(`current pos_x:${new_x}`);
  console.log(`current pos_y:${new_y}`);
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
        toggleTurn();
        warderWins();
      } else if (gridArray[new_x][new_y] === 0) {
        //if new position is a freeblock
        gridArray[currentPlayer.pos_x][currentPlayer.pos_y] = 0;
        gridArray[new_x][new_y] = 3;
        players.find((player) => player.id === id).pos_x = new_x;
        players.find((player) => player.id === id).pos_y = new_y;
        io.sockets.emit("newGrid", gridArray);
        toggleTurn();
      }
    } else if (currentPlayer.role === "prisoner" && !warderTurn) {
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
        io.sockets.emit("newGrid", gridArray);
        // socket.emit("newGrid", gridArray);
        toggleTurn();
      }
    } else {
      console.log("invalid role");
      return;
    }
  }
}

function warderWins() {
  //warder score + 1
  players.find((player) => player.role === "warder").score += 1;
  io.sockets.emit("warderWins", players);
  console.log("warder wins");
  gameRunning = false;
  players[0].ready = false;
  players[1].ready = false;
  startingId = players.find((player) => player.role === "warder").id;
}

function prisonerWins() {
  //prisoner score +1
  players.find((player) => player.role === "prisoner").score += 1;
  io.sockets.emit("prisonerWins", players);
  console.log("prisoner wins");
  gameRunning = false;
  players[0].ready = false;
  players[1].ready = false;
  startingId = players.find((player) => player.role === "prisoner").id;
}

function surrender(id) {
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
}

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

// app.get("/api/resetScores", (req, res) => {
//   console.log("reset score clicked");
//   resetScores();
// });

app.get("/api/resetGame", (req, res) => {
  console.log("reset game clicked");
  resetGame();
});
