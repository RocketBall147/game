const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: SCENE_WIDTH,
  height: SCENE_HEIGHT,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
  this.load.svg('footballfield', 'assets/pole.svg', { width: SCENE_WIDTH, height: SCENE_HEIGHT });
  this.load.svg('goal', 'assets/vorota.svg', { width: SCENE_WIDTH / 2, height: SCENE_HEIGHT / 2 });
  this.load.image('ship', 'assets/player.png');
  this.load.image('otherPlayer', 'assets/player.png');
  this.load.image('star', 'assets/circle.png', { width: 1, height: 1 });
}

function create() {
  var self = this;
  this.socket = io();
  this.players = this.add.group();
  
  this.field = this.add.image(SCENE_WIDTH / 2, SCENE_HEIGHT / 2, 'footballfield');
  this.goalLeft = this.add.image(20, SCENE_HEIGHT / 2, 'goal');
  this.goalRight = this.add.image(SCENE_WIDTH - 20, SCENE_HEIGHT / 2, 'goal').setAngle(180);

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        displayPlayers(self, players[id], 'ship');
      } else {
        displayPlayers(self, players[id], 'otherPlayer');
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    displayPlayers(self, playerInfo, 'otherPlayer');
  });

  this.socket.on('disconnect', function (playerId) {
    self.players.getChildren().forEach(function (player) {
      if (playerId === player.playerId) {
        player.destroy();
      }
    });
  });

  this.socket.on('playerUpdates', function (players) {
    Object.keys(players).forEach(function (id) {
      self.players.getChildren().forEach(function (player) {
        if (players[id].playerId === player.playerId) {
          //player.setRotation(players[id].rotation);
          player.setPosition(players[id].x, players[id].y);
        }
      });
    });
  });

  this.socket.on('updateScore', function (scores) {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });

  this.socket.on('starLocation', function (starLocation) {
    if (!self.star) {
      self.star = self.add.image(starLocation.x, starLocation.y, 'star');
    } else {
      self.star.setPosition(starLocation.x, starLocation.y);
    }
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
  this.downKeyPressed = false;
  
  this.spaceKeyPressed = false;
}

function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const up = this.upKeyPressed;
  const down = this.downKeyPressed;
  const space = this.spaceKeyPressed;
  
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
  this.downKeyPressed = false;
  this.spaceKeyPressed = false;
  if (this.cursors.left.isDown) this.leftKeyPressed = true;
  else if (this.cursors.right.isDown) this.rightKeyPressed = true;
  if (this.cursors.up.isDown) this.upKeyPressed = true;
  else if (this.cursors.down.isDown) this.downKeyPressed = true;
  
  if (this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).isDown) this.spaceKeyPressed = true;

  if (left !== this.leftKeyPressed || right !== this.rightKeyPressed || up !== this.upKeyPressed || down !== this.downKeyPressed || space !== this.spaceKeyPressed) {
    this.socket.emit('playerInput', { left: this.leftKeyPressed, right: this.rightKeyPressed, up: this.upKeyPressed, down : this.downKeyPressed, space : this.spaceKeyPressed });
  }
}

function displayPlayers(self, playerInfo, sprite) {
  const player = self.add.sprite(playerInfo.x, playerInfo.y, sprite).setOrigin(0.5, 0.5).setDisplaySize(50, 50);
  if (playerInfo.team === 'blue') player.setTint(0x0000ff);
  else player.setTint(0xff0000);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}
