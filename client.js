const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;

const socket = io.connect('http://localhost:8000');
let gameScene = new Phaser.Scene('Game');

players = [];

class Player extends Phaser.GameObjects.Arc {
    constructor(scene, x, y, id) {
        super(scene, x, y, 16, 0, 360, false, '0xffffff', 1);
        this.setStrokeStyle(3, '0x000000', 1);
        this.id = id;
        this.kick = false;
        this.setDepth(1);
        scene.add.existing(this);
    }

    update(x, y, kick) {
        this.x = x;
        this.y = y;
        this.strokeColor = (kick) ? '0xcccccc' : '0x000000';
    }

    // preUpdate(time, delta) {}
}

gameScene.preload = function () {
    KEYS = this.input.keyboard.addKeys({
        up: 'W',
        down: 'S',
        left: 'A',
        right: 'D',
        kick: 'SPACE'
    });
    this.load.svg('footballfield', '/sprites/pole.svg', { width: SCENE_WIDTH, height: SCENE_HEIGHT });
    this.load.svg('goal', '/sprites/vorota-01.svg', { width: SCENE_WIDTH / 2, height: SCENE_HEIGHT / 2 });

    players = this.add.group({
        classType: Phaser.GameObjects.Arc,
        active: true,
        maxSize: -1,
        runChildUpdate: false,
    });
};

gameScene.create = function () {
    const field = this.add.image(-1, -49, 'footballfield').setOrigin(0);
    const goalLeft = this.add.image(24, SCENE_HEIGHT / 2, 'goal');
    const goalRight = this.add.image(SCENE_WIDTH - 24, SCENE_HEIGHT / 2, 'goal');
    goalRight.angle = 180;

    field.displayHeight = 700;
    setInterval(() => {
        let key = [];

        if (KEYS.up.isDown) {
            key.push('up');
        }
        if (KEYS.down.isDown) {
            key.push('down');
        }
        if (KEYS.left.isDown) {
            key.push('left');
        }
        if (KEYS.right.isDown) {
            key.push('right');
        }
        if (KEYS.kick.isDown) {
            key.push('kick');
        }

        socket.emit('direction', key);
    }, 1000 / 60);
};

gameScene.update = function () { };

let config = {
    type: Phaser.AUTO,
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    scene: gameScene,
};

const game = new Phaser.Game(config);

socket.on('position', function (users) {
    const plCopy = players.getChildren().slice();
    plCopy.forEach(player =>
        users.findIndex(user => user.id === player.id) === -1 ? players.killAndHide(player) : undefined,
    );

    users.forEach(user => {
        const playerIndex = players.getChildren().findIndex(player => user.id === player.id);
        if (playerIndex !== -1) {
            players.getChildren()[playerIndex].update(user.x, user.y, user.kick);
        } else {
            players.add(new Player(gameScene, user.x, user.y, user.id));
        }
    });
});

socket.on('destroy', userID => {
    gameScene.children.list.splice(gameScene.children.list.findIndex(child => child.id === userID), 1);
});
