var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));


var players = [];
var artistChosen = false;

function sendUpdatedPlayerList(){
    var updatedPlayers = [];
    for(var i=0; i<players.length; i++){
        var pl = players[i];
        var li = {id: pl.id, name: pl.username, ready: pl.ready};
        updatedPlayers.push(li)        
    }
    io.emit('update:playerlist', {players: updatedPlayers});    
}

io.on('connection', function (playerSocket) {
    artistChosen = false;
    playerSocket.emit('welcome', playerSocket.id);
    players.push(playerSocket);
    playerSocket.on('disconnect', function(){
       players.splice(players.indexOf(playerSocket), 1); 
       artistChosen = false;
    });

    playerSocket.ready = false;
    playerSocket.join('artists');
    
    playerSocket.on('update:name', function(d){
        playerSocket.username = d.name;
        // Option: create the playerlist here, then pass it down complete to each connection.
        sendUpdatedPlayerList();
    });
    
    playerSocket.on('ready', function(d){
        playerSocket.ready = d.ready;
        playerSocket.artist = true; //Do I need this?
        playerSocket.noun = d.noun;
        playerSocket.username = d.name;

        sendUpdatedPlayerList();
        
        var startGame = checkPlayersReady();
        //If everyone is ready, start the game.
        if(startGame){
            var noun = grabRandomNoun();
            if(!artistChosen){
                artistChosen = kickRandomPlayer();
            }
            var ids = [];
            for(var i=0; i<players.length; i++)
                ids.push(players[i].id)
            io.emit('start', ids);
            io.to('artists').emit('reveal noun', {noun: noun});
        }
    });

    
    playerSocket.on('drawing', function(d){
        playerSocket.broadcast.emit('draw', d);
    });
});



function checkPlayersReady(){
    for(var i=0; i<players.length; i++){
        if(!players[i].ready)
            return false;
    }
    return true;
}
function grabRandomNoun(){
    var ni = Math.random()*players.length << 0;
    return players[ni].noun;
}
function kickRandomPlayer(){
    var pi = Math.random()*players.length << 0;
    players[pi].artist = false;
    players[pi].leave('artists');
    return true; //The idea was to return false if we aren't able to leave for some reason.
}