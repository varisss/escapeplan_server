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

let socketIds = [];

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
                pos_y: 0
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

    socket.on('move', (ret)=> {
        console.log(socket.id);
        console.log(ret);

       
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

function startGame(){
    const newGrid = randomGrid(gridArray);
    gridArray = newGrid;
    setRoles();
    warderTurn = true;
    io.emit('initializeRole', players); 
    io.emit('newGrid', newGrid);
}

