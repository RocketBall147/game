const socket = io.connect('http://157.230.18.240:8000');
let gameScene = new Phaser.Scene('Game');

const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;
const DIST = 2;
const SPEED = 1;
let KEYS = undefined;

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

    this.add.rectangle(SCENE_WIDTH / 2, SCENE_HEIGHT / 2, SCENE_WIDTH, SCENE_HEIGHT, '0x009500');

    // for (let i = 0; i < 1; i++) {
    //     players.push(new Player(this, SCENE_WIDTH * Math.random(), SCENE_HEIGHT * Math.random(), 16, '0xffffff', 1));
    // }
};

gameScene.create = function () {
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
    }, 1000 / 30);
};

gameScene.update = function () {
    // players.forEach(player => {
    //     let key = undefined;
    //     // if (KEYS.up.isDown) {
    //     //     key = 'up';
    //     // } else if (KEYS.down.isDown) {
    //     //     key = 'down';
    //     // } else if (KEYS.left.isDown) {
    //     //     key = 'left';
    //     // } else if (KEYS.right.isDown) {
    //     //     key = 'right';
    //     // }
    //     player.update(key);
    // });
};

let config = {
    type: Phaser.AUTO, //Phaser will decide how to render our game (WebGL or Canvas)
    width: 640, // game width
    height: 480, // game height
    scene: gameScene, // our newly created scene
};

const game = new Phaser.Game(config);

socket.on('position', function (users) {
    console.log(users)
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

