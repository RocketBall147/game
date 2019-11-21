const express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const ip = require('ip');

const address = ip.address();
const port = 8000;

server.listen(port, address, () => {
    console.log(`Listening ${address}:${port}`);
});

// WARNING: app.listen(80) will NOT work here!
app.use(express.static('.'));

const MAX_SPEED = 4;
const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;

const BALL_RADIUS = 10;
const USER_RADIUS = 16;

const Game = {
    minX: 0,
    minY: 0,
    maxX: SCENE_WIDTH,
    maxY: SCENE_HEIGHT,
    acceleration: 0.5,
    maxSpeed: MAX_SPEED,
    friction: 0.2,
    users: [],
    ball: {
        x: 320,
        y: 240,
        radius: BALL_RADIUS,
        speed: {
            x: 0,
            y: 0,
        },
        maxSpeed: MAX_SPEED,
    },
};

const isContact = (a, b) => {
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    return dist <= a.radius + b.radius;
};

const calculateStopSpeed = (direction, acceleration, speed, minVelocity = 0) => {
    return direction < 0
        ? speed - acceleration < minVelocity
            ? minVelocity
            : speed - acceleration
        : speed + acceleration > -minVelocity
        ? -minVelocity
        : speed + acceleration;
};

const calculateSpeed = (direction, acceleration, speed, maxSpeed) => {
    if (speed > maxSpeed || speed < -maxSpeed) return calculateStopSpeed(-direction, acceleration, speed, maxSpeed);

    if (direction < 0) {
        return speed - acceleration < -maxSpeed ? -maxSpeed : speed - acceleration;
    } else if (direction > 0) {
        return speed + acceleration > maxSpeed ? maxSpeed : speed + acceleration;
    }
};

let events = [];

io.on('connection', function(socket) {
    Game.users.push({
        x: SCENE_WIDTH / 2  - 100,
        y: SCENE_HEIGHT / 2,
        speed: {
            x: 0,
            y: 0,
        },
        radius: USER_RADIUS,
        kick: false,
        maxSpeed: MAX_SPEED,
        socket,
    });

    socket.on('direction', function(data) {
        if (data) {
            events.push({ data, id: socket.id });
        }
    });

    socket.on('disconnect', function() {
        Game.users.splice(
            Game.users.findIndex(user => user.socket.id === socket.id),
            1,
        );
    });
});

setInterval(function() {
    // console.log(Game.users);
    // console.time()
    events.forEach(event => {
        const { up, left, right, down, kick } = event.data;
        const user = Game.users.find(u => u.socket.id === event.id);
        if (!user) return;

        if (kick) {
            user.kick = true;
            user.maxSpeed = 2;
        } else {
            user.kick = false;
            user.maxSpeed = MAX_SPEED;
        }

        if ((up && down) || !(up || down)) {
            if (user.speed.y > 0)
                user.speed.y = calculateStopSpeed(-1, Game.acceleration * Game.friction, user.speed.y);
            else if (user.speed.y < 0)
                user.speed.y = calculateStopSpeed(1, Game.acceleration * Game.friction, user.speed.y);
        } else if (up || down) {
            user.speed.y = calculateSpeed(up ? -1 : 1, Game.acceleration * Game.friction, user.speed.y, user.maxSpeed);
        }

        if ((left && right) || !(left || right)) {
            if (user.speed.x > 0)
                user.speed.x = calculateStopSpeed(-1, Game.acceleration * Game.friction, user.speed.x);
            else if (user.speed.x < 0)
                user.speed.x = calculateStopSpeed(1, Game.acceleration * Game.friction, user.speed.x);
        } else if (left || right) {
            user.speed.x = calculateSpeed(
                left ? -1 : 1,
                Game.acceleration * Game.friction,
                user.speed.x,
                user.maxSpeed,
            );
        }

        user.y += user.speed.y;
        user.x += user.speed.x;
    });

    Game.users.forEach(user => {
        if (isContact(user, Game.ball)) {
            // console.log(user.kick);
            if (user.kick) {
                const maxSpeed = Math.max(user.speed.x, user.speed.y);
                const minSpeed = Math.min(user.speed.x, user.speed.y);

                Game.ball.speed = {
                    x: user.speed.x * 3,
                    y: user.speed.y * 3,

                    // y: (user.speed.x < user.speed.y) ? MAX_SPEED + MAX_SPEED * (minSpeed/maxSpeed) : MAX_SPEED,
                };
            } 

            user.kick = false;
        }
    });

    // const maxSpeed = Math.max(Game.ball.speed.x, Game.ball.speed.y);
    // const countTick = Game.ball.speed.x !== Game.ball.speed.y
    const countTick = Math.max(Game.ball.speed.x, Game.ball.speed.y) / Game.acceleration;
    // : -1;

    // if (maxSpeed == Game.ball.speed.y) {
    // if(Game.ball.speed.x > 0)

    Game.ball.speed.x = calculateStopSpeed(
        -Game.ball.speed.x,
        (countTick !== 0 ? Math.abs(Game.ball.speed.x / countTick) : Game.acceleration) * Game.friction,
        Game.ball.speed.x,
    );
    // if(Game.ball.speed.y > 0)

    Game.ball.speed.y = calculateStopSpeed(
        -Game.ball.speed.y,
        (countTick !== 0 ? Math.abs(Game.ball.speed.y / countTick) : Game.acceleration) * Game.friction,
        Game.ball.speed.y,
    );
    // } else {
    //     Game.ball.speed.x = calculateStopSpeed(-Game.ball.speed.x, maxSpeed / countTick * Game.friction, Game.ball.speed.x);
    //     Game.ball.speed.y = calculateStopSpeed(-Game.ball.speed.y, Game.ball.speed.y / countTick * Game.friction, Game.ball.speed.y);
    // }
    // Game.ball.speed.x = calculateStopSpeed(-Game.ball.speed.x, Game.acceleration * Game.friction, Game.ball.speed.x);
    //     Game.ball.speed.y = calculateStopSpeed(-Game.ball.speed.y, Game.acceleration * Game.friction, Game.ball.speed.y);

    Game.ball.x += Game.ball.speed.x;
    Game.ball.y += Game.ball.speed.y;
    Game.users.forEach(user => {
        user.socket.emit('position', {
            users: Game.users.map(user => {
                return {
                    x: user.x,
                    y: user.y,
                    id: user.socket.id,
                    kick: user.kick,
                };
            }),
            ball: {
                x: Game.ball.x,
                y: Game.ball.y,
            },
        });
    });

    // console.timeEnd()

    events = [];
}, 1000 / 60);
