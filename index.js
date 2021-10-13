const app = require('express')()
const server  = require('http').createServer(app)
const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });

let gridArray = [
    [1,1,1,1,1],
    [2,3,4,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
]

let warderTurn = true;

let allClientIds = [];

let players = [];


io.on('connection', socket => {
    // allClientIds.push(socket.id);

    socket.on('joinGame', (nickname)=> {
        // console.log(io.engine.clientsCount);
        let player = {
                name: nickname,
                id: socket.id,
                role: '',
                pos_x: 0,
                pos_y: 0,
                score: 0
            }
        players.push(player);
        console.log(players);
        allClientIds.push(socket.id);
        console.log(`number of clients ready: ${allClientIds.length}`);
        if(allClientIds.length===2){
            console.log(allClientIds);
            startGame();
        }
    })

    socket.on('disconnect', function() {
      console.log('Got disconnect!');
      const j = allClientIds.indexOf(socket.id);
      allClientIds.splice(j,1);
      console.log(allClientIds.length);
      console.log(allClientIds);
      for(let i in players){
          if (players[i].id === socket.id){
              players.splice(i,1);
          }
      }
   });

    socket.on('move', (direction)=> {
        move(direction, socket.id, socket);
    })
})

server.listen(4000, function(){
    console.log('listening on port 4000')
})


function randomGrid(gridArray) {
    const array = [].concat(...gridArray);
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    let newGridArray = [];
    while(array.length) newGridArray.push(array.splice(0,5));
  
    return newGridArray;
}

function setRoles(){
    if(Math.random<0.5){
        players[0].role = 'warder';
        players[1].role = 'prisoner';
    } else{
        players[0].role = 'prisoner';
        players[1].role = 'warder';
    }
}

function setPositions(){
    for(let i=0; i<5; i++){
        for(let j=0; j<5; j++){
            if (gridArray[i][j]===3){
                players.find(player=> player.role==='warder').pos_x = i;
                players.find(player=> player.role==='warder').pos_y = j;
            }
            if (gridArray[i][j]===4){
                players.find(player=> player.role==='prisoner').pos_x = i;
                players.find(player=> player.role==='prisoner').pos_y = j;
            }
        }
    }
}

function startGame(){
    const newGrid = randomGrid(gridArray);
    gridArray = newGrid;
    setRoles();
    setPositions();
    // console.log(players);
    warderTurn = true;
    io.emit('initializeRole', players); 
    io.emit('newGrid', newGrid);
}

function move(direction, id, socket){
    const currentPlayer = players.find(player => player.id === id);
    if (!((currentPlayer.role==='warder'&& warderTurn)||(currentPlayer.role==='prisoner'&&!warderTurn))){
        return;
    }
    console.log(currentPlayer);
    let new_x = currentPlayer.pos_x;
    let new_y = currentPlayer.pos_y;
    console.log(`current pos_x:${new_x}`);
    console.log(`current pos_y:${new_y}`);
    switch(direction){
        case 'left':
            new_y = new_y-1;
            break;
        case 'right':
            new_y = new_y+1;
            break;
        case 'up':
            new_x = new_x-1;
            break;
        case 'down':
            new_x = new_x+1;
            break;
        default:
            return;
    }
    //check if new pos is within the grid  
    if(new_x>=0 && new_x<=4 && new_y>=0 && new_y<=4){
        if(currentPlayer.role === 'warder' && warderTurn){
            if (gridArray[new_x][new_y] === 4){  
                warderWins();
            } else if(gridArray[new_x][new_y]===0){ //if new position is a freeblock
                gridArray[currentPlayer.pos_x][currentPlayer.pos_y]=0;
                gridArray[new_x][new_y] = 3;
                players.find(player => player.id === id).pos_x = new_x;
                players.find(player => player.id === id).pos_y = new_y;
                io.sockets.emit("newGrid", gridArray);
                toggleTurn();
            }
        } else if(currentPlayer.role === 'prisoner' && !warderTurn){
            if (gridArray[new_x][new_y] === 2){  
                prisonerWins();
            } else if (gridArray[new_x][new_y] === 3){
                warderWins();
            } else if (gridArray[new_x][new_y] === 0){
                gridArray[currentPlayer.pos_x][currentPlayer.pos_y]=0;
                gridArray[new_x][new_y] = 4;
                players.find(player => player.id === id).pos_x = new_x;
                players.find(player => player.id === id).pos_y = new_y;
                io.sockets.emit("newGrid", gridArray);
                // socket.emit("newGrid", gridArray);
                toggleTurn();
            }
        } else{
            console.log('invalid role');
            return;
        }
    }
}

function warderWins(){
    //warder score + 1
    console.log('warderWins')
}

function prisonerWins(){
    //warder score -1 
    console.log('prisoner wins')
}

function toggleTurn(){
    warderTurn = !warderTurn;
    console.log('toggleTurn');
    console.log(`warderTurn: ${warderTurn}`);
    //notify both clients that the new round starts. will have to send warderTurn
    console.log('restartTimer');
}