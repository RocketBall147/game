const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;

const players = {};

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: SCENE_WIDTH,
  height: SCENE_HEIGHT,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
	  fps: 60,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};

function preload() {
  //this.load.svg('goal', 'assets/vorota.svg', { width: SCENE_WIDTH / 2, height: SCENE_HEIGHT / 2 });
  this.load.image('goal', 'assets/vorota1.png');
  this.load.image('ship', 'assets/player.png');
  this.load.image('star', 'assets/circle.png');
}

function create() {
  const self = this;
  this.players = this.physics.add.group();

  this.scores = {
    blue: 0,
    red: 0
  };
  
  this.goalLeft = this.physics.add.image(20, SCENE_HEIGHT / 2, 'goal');
  this.goalRight = this.physics.add.image(SCENE_WIDTH - 20, SCENE_HEIGHT / 2, 'goal').setAngle(180);
  this.star = this.physics.add.image(SCENE_WIDTH*0.5, SCENE_HEIGHT*0.5, 'star').setCircle(20);
  this.star.setCollideWorldBounds(true);
  //this.star.setMass(10);
  //this.star.setDrag(10, 10);
  
  this.physics.add.collider(this.players);
  this.physics.add.collider(this.players, this.star);

  this.physics.add.overlap(this.star, this.goalLeft, function (star, goal) {
    self.scores.red += 1;
	self.star.setPosition(800*0.5, 600*0.5);
	self.star.setVelocity(0);
	self.star.setBounce(0);
    io.emit('updateScore', self.scores);
    io.emit('starLocation', { x: self.star.x, y: self.star.y });
  });
  this.physics.add.overlap(this.star, this.goalRight, function (star, goal) {
    self.scores.blue += 1;
	self.star.setPosition(800*0.5, 600*0.5);
	self.star.setVelocity(0);
	self.star.setBounce(0);
    io.emit('updateScore', self.scores);
    io.emit('starLocation', { x: self.star.x, y: self.star.y });
  });

  io.on('connection', function (socket) {
    console.log('a user connected');
    // create a new player and add it to our players object
    players[socket.id] = {
      rotation: 0,
      x: Math.floor(Math.random() * 700) + 50,
      y: Math.floor(Math.random() * 500) + 50,
      playerId: socket.id,
      team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
      input: {
        left: false,
        right: false,
        up: false,
		down: false,
		space: false
      }
    };
    // add player to server
    addPlayer(self, players[socket.id]);
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    // send the star object to the new player
    socket.emit('starLocation', { x: self.star.x, y: self.star.y });
    // send the current scores
    socket.emit('updateScore', self.scores);

    socket.on('disconnect', function () {
      console.log('user disconnected');
      // remove player from server
      removePlayer(self, socket.id);
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnect', socket.id);
    });

    // when a player moves, update the player data
    socket.on('playerInput', function (inputData) {
      handlePlayerInput(self, socket.id, inputData);
    });
  });
}

function update() {
  this.players.getChildren().forEach((player) => {
    const input = players[player.playerId].input;
	player.setVelocity(0, 0);
	if (input.left) {
		player.setVelocityX(-200);
    } else if (input.right) {
		player.setVelocityX(200);
    }
	if (input.up) {
		player.setVelocityY(-200);
    } else if (input.down) {
		player.setVelocityY(200);
	}
	
    this.physics.overlap(player, this.star, pushBall, pushBallCheck, this);
	
	/**player.setAcceleration(0, 0);
	if (input.left) {
		player.setAccelerationX(-200);
    } else if (input.right) {
		player.setAccelerationX(200);
    }
	if (input.up) {
		player.setAccelerationY(-200);
    } else if (input.down) {
		player.setAccelerationY(200);
	}**/

    players[player.playerId].x = player.x;
    players[player.playerId].y = player.y;
  });
  
  this.physics.world.wrap(this.players, 5);
  io.emit('playerUpdates', players);
  io.emit('starLocation', { x: this.star.x, y: this.star.y });
}

function pushBall (player, star) {
	//PUSH BALL
	star.setBounce(1);
}

function pushBallCheck (player, star) {
	if (players[player.playerId].input.space) return true;
	else return false;
}

function randomPosition(max) {
  return Math.floor(Math.random() * max) + 50;
}

function handlePlayerInput(self, playerId, input) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      players[player.playerId].input = input;
    }
  });
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(50, 50).setCircle(25);
  //player.setDrag(500,500);
  //player.setAngularDrag(100);
  player.setMaxVelocity(200);
  //player.setMass(100);
  //player.setFriction(50,50);
  //player.setCollideWorldBounds(true);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}

function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

const game = new Phaser.Game(config);
window.gameLoaded();
