var express = require('express');

var app = express();
var port = 8000;
app.use(express.static('public'));
var server = app.listen(port, function() {
  console.log('Socket server listening on port %d in %s mode', port, app.settings.env);
});

var socket = require('socket.io');
var io = socket(server);

var randomWords = require('random-words');

var userCount = 1;

io.use((socket, next) => {
  let username = socket.handshake.auth.username;
  if(username === "") {
    username = "Player" + userCount;
    userCount++;
  }

  socket.username = username;
  socket.points = 0;
  socket.canDraw = false;
  next();
});

io.on('connection', newConnection);

// Game variables
const STATE = Object.freeze({
  RUNNING: 'running',
  WAITING: 'waiting',
  STOPPED: 'stopped',
  ROUND_END: 'round_end'
});
var activeUserList = [];

var gameHasStarted = false;
var playersNeededToStart = 3;
var selectedWord = null;
var draftsman = null;
var correctPlayers = 0;
var roundPoints = 0;
var picker = 0;
var round = 0;
var guessingTime = 180;
var timers = { round_timer: null, game_timer: null, pick_timer: null, start_timer: null };
var game_state = STATE.STOPPED;
round_timer();

function newConnection(socket) {
  console.log("a user connected: ID: " + socket.id + " USERNAME: " + socket.username);
  console.log(game_state);

  // Connection -> add user to users array and broadcast that a user has connected
  const users = [];
  for(let [id, socket] of io.of("/").sockets) {
    users.push({
      userID: id,
      username: socket.username,
      points: socket.points
    });
  }
  activeUserList = users;

  // Init for connected user
  socket.emit('setup', users);
  // Announce to other users that a new user has connected
  socket.broadcast.emit('user connected', {
    userID: socket.id,
    username: socket.username,
    points: socket.points
  });

  // Checking if the game should start or not
  if(io.of("/").sockets.size >= playersNeededToStart && !gameHasStarted) {
    start_timer_start(users);
  } else if(gameHasStarted && io.of("/").sockets.size <= 1) { // Checking if the game should be canceled
    gameHasStarted = false;
    round = 1;
    timer_stop('all');
    game_state = STATE.STOPPED;
    io.sockets.emit('game_cancel', 'Not enough players');
    console.log("Not enough players!");
  } else if(!gameHasStarted && io.of("/").sockets.size < playersNeededToStart) {
    game_state = STATE.WAITING;
    io.sockets.emit('game_waiting', { players: users.length, playersNeeded: playersNeededToStart });
    console.log("Waiting for players!");
  } else {
    console.log("Game has already started!");
  }

  // Drawing event
  socket.on('mouse', (data) => {
    if(data.username === draftsman.username) {
      io.sockets.emit('mouse', data);
      //console.log(data);
    }
  });

  // Clear button event
  socket.on('clear', (data) => {
    if(data.username === draftsman.username) {
      socket.broadcast.emit('clear', data);
      console.log(data.username + " pressed clear button");
    }
  });

  // Changing utilities for draftsman
  socket.on('change', (data) => {
    if(data.username === draftsman.username) {
      io.sockets.emit('change', data);
      if(data?.color)
        console.log(data.username + " changed his " + data.type + " to: " + data.color);
      else if(data?.util)
        console.log(data.username + " changed his " + data.type + " to: " + data.util);
      else
        console.log(data.username + " changed his " + data.type + " to: " + data.brushSize);
    }
  });

  // Disconnect event
  socket.on('disconnect', () => {
    if(gameHasStarted && io.of("/").sockets.size <= 1) {
      gameHasStarted = false;
      round = 1;
      timer_stop('all');
      io.sockets.emit('game_cancel', 'Not enough players');
    }

    if(draftsman !== null) {
      if(socket.username === draftsman) {
        gameHasStarted = false;
        round = 1;
        timer_stop('all');
        io.sockets.emit('game_cancel', 'Draftsman left');
      }
    }

    activeUserList = activeUserList.filter(player => player.username != socket.username);

    socket.broadcast.emit('user disconnected', socket.username);
    console.log("user disconnected: ID: " + socket.id + " USERNAME: " + socket.username);
  });

  // Word guess event
  socket.on('guess', (data) => {
    if(gameHasStarted && selectedWord !== null) {
      if(data.guess.toLowerCase() == selectedWord.toLowerCase()) { // Check if the guessed word is correct
        data.guess = "*hidden*";
        data.correct = true;
        socket.points += guessingTime * (io.of("/").sockets.size-1);
        data.points = socket.points;

        correctPlayers++;
        roundPoints += data.points;

        if(guessingTime > 30) {
          guessingTime = 30;
        }
      } else {
        data.correct = false;
      }
    }

    console.log(data);

    io.sockets.emit('guess', data);

    if(correctPlayers == io.of("/").sockets.size-1) {
      timer_stop(timers.game_timer);
      game_state = STATE.ROUND_END;
      draftsman.points = Math.round(roundPoints / io.of("/").sockets.size);
      io.of("/").sockets.forEach((socket) => {
        if(draftsman.username === socket.username)
          socket.points += draftsman.points;
      });
      io.sockets.emit('round_end', { username: draftsman.username, points: draftsman.points });
      correctPlayers = 0;
      roundPoints = 0;
      draftsman = null;

      console.log("Round ended! (Everyone guessed)");
    }

    console.log(data.username + " guessed: " + data.guess);
  });

  // Word selection event
  socket.on('word', (data) => {
    selectedWord = data.selectedWord;

    io.sockets.emit('word', { wordLength: selectedWord.length, username: data.username });
    timer_stop(timers.pick_timer);
    game_timer_start();
    console.log(data.username + " selected the word to guess: " + selectedWord);
  });
}

// To do:
// Round rotation
// More colors
// Brush size

// More advanced:
// Lobbies
// Game settings
// Guess streak - multiplier for users that guessed more than 2 words in a row

// Handle rounds
function game(round, users) {
  if(round >= io.of("/").sockets.size * 2) {
    //console.log(io.of("/").sockets);
    let data = [];
    io.of("/").sockets.forEach((socket) => {
      data.push({
        username: socket.username,
        points: socket.points
      });
    });
    io.sockets.emit('game_end', data);
    round = 0;
    console.log("Round limit reached! Ending the game..");
    return;
  }

  let words = randomWords(3);
  let pick = users.length - 1 - picker;
  if(pick < 0) {
    picker = 0;
    pick = users.length - 1 - picker;
    picker++;
  } else
    picker++;


  draftsman = users[pick]; // ~~(Math.random() * users.length)
  let data = {
    words: words,
    draftsman: draftsman.username,
    round: round
  };

  console.log(data);

  game_state = STATE.RUNNING;
  io.sockets.emit('round_start', data);
  pick_timer_start();
}

function round_timer() {
  timers.round_timer = setInterval(function() {
    if(game_state === STATE.ROUND_END) {
      start_timer_start(activeUserList);
    }
  }, 100);
}

// Handle timer
function game_timer_start() {
  guessingTime = 180;
  timers.game_timer = setInterval(function() {
    io.sockets.emit('tick', { type: 'Guessers', time: guessingTime });
    guessingTime--;

    if(guessingTime == -1) {
      timer_stop(timers.game_timer);
      // end the round
      game_state = STATE.ROUND_END;
      io.sockets.emit('round_end', 'time_expired');
      console.log("Round end! (Time expired)");
    }
  }, 1000);
}

function pick_timer_start() {
  var pickingTime = 15;
  timers.pick_timer = setInterval(function() {
    io.sockets.emit('tick', { type: 'Draftsman', time: pickingTime });
    pickingTime--;

    if(pickingTime == -1) {
      timer_stop(timers.pick_timer);
      // end the round
      game_state = STATE.ROUND_END;
      io.sockets.emit('round_end', 'draftsman_time_expired');
      console.log("Round ended! (Draftsman did not pick a word in the time limit)");
    }
  }, 1000);
}

function start_timer_start(users) {
  game_state = STATE.RUNNING;
  gameHasStarted = true;
  if(timers.round_timer === null) {
    round_timer();
  }

  var countdown = 10;
  timers.start_timer = setInterval(function() {
    io.sockets.emit('tick', { type: "Start", time: countdown });
    countdown--;

    if(countdown == -1) {
      timer_stop(timers.start_timer);
      game(++round, users);
    }
  }, 1000);
}

function timer_stop(timer) {
  if(timer === 'all') {
    console.log("Stop all timers!");
    for (const timer in timers) {
      if(timers[timer] !== null) {
        clearInterval(timers[timer]);
        timers[timer] = null;
      }
    }
  } else {
    if(timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }
}

// Find a way how to make this work!
/*function timer_start(timeToCountdown, type) {
  let time = timeToCountdown;
  let timer = setInterval(function() {
    io.sockets.emit('tick', { type: type, time: time });
    time--;

    if(time == -1) {
      timer_stop(timer);

      if(type === "Guessers") {
        io.sockets.emit('round_end', 'time_expired');
        console.log("Round end! (Time expired)");
      } else if(type === "Draftsman") {
        io.sockets.emit('round_end')
      }
    }
  }, 1000);
}*/
