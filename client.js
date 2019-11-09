const socket = io.connect('http://157.230.18.240:8000');
let gameScene = new Phaser.Scene('Game');

const SCENE_WIDTH = 640  *2;
const SCENE_HEIGHT = 480 * 2;
const DIST = 2;
const SPEED = 1;
let KEYS = undefined;
let img;

players = [];

class Player extends Phaser.GameObjects.Arc {
    constructor(scene, x, y, id) {
        super(scene, x, y, 16, 0, 360, false, "0xffffff", 1);
        this.setStrokeStyle(2, '0x000000', 1);
        this.id = id;
        scene.add.existing(this);
    }

    update(x, y) {
        this.x = x;
        this.y = y;
    }

    // preUpdate(time, delta) {}
}

gameScene.preload = function () {
    KEYS = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
    });
    this.load.svg('footballfield', '/sprites/pole.svg', {width:SCENE_WIDTH+100, height: SCENE_HEIGHT + 100 });
    this.load.svg('goal', '/sprites/vorota.svg');
};

gameScene.create = function () {
	this.add.image(0, 0, 'footballfield').setOrigin(0);
	this.add.image(50, 50, 'goal');
  setInterval(() => {
        let key = [];

        if (KEYS.up.isDown) {
            key.push('up');
        } if (KEYS.down.isDown) {
            key.push('down');
        } if (KEYS.left.isDown) {
            key.push('left');
        } if (KEYS.right.isDown) {
            key.push('right');
        };
        
        socket.emit("direction", key);
    }, 1000 / 128);
};

gameScene.update = function () {
   
};

let config = {
    type: Phaser.AUTO, //Phaser will decide how to render our game (WebGL or Canvas)
    width: SCENE_WIDTH, // game width
    height: SCENE_HEIGHT, // game height
    scene: gameScene, // our newly created scene
};

const game = new Phaser.Game(config);

socket.on('position', function (users) {
    users.forEach(user => {
        const playerIndex = players.findIndex((player => user.id === player.id));

        if (playerIndex !== -1) {
            players[playerIndex].update(user.x, user.y);
        } else {
            const newPlayer = new Player(gameScene, user.x, user.y, user.id);
            players.push(newPlayer);
        }
    })
});

