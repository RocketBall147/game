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

const MAX_VELOCITY = 4;
const SCENE_WIDTH = 640;
const SCENE_HEIGHT = 480;

const Game = {
    minX: 0,
    minY: 0,
    maxX: SCENE_WIDTH,
    maxY: SCENE_HEIGHT,
    acceleration: 0.5,
    maxVelocity: MAX_VELOCITY,
    friction: 0.2,
    users: [],
    ball: {
        x:0,
        y:0,
        velocity: {
            x: 0,
            y: 0,
        },
        maxVelocity: MAX_VELOCITY,
    }
};

const calculateStopSpeed = (direction, acceleration, velocity, minVelocity = 0) => {
    return (direction < 0) ?
        (velocity - acceleration < minVelocity) ? minVelocity : velocity - acceleration :
        (velocity + acceleration > -minVelocity) ? -minVelocity : velocity + acceleration;
}

const calculateSpeed = (direction, acceleration, velocity, maxVelocity) => {
    if (velocity > maxVelocity || velocity < -maxVelocity) return calculateStopSpeed(-direction, acceleration, velocity, maxVelocity);

    if (direction < 0) {
        return (velocity - acceleration < -maxVelocity) ? -maxVelocity : velocity - acceleration;
    } else if (direction > 0) {
        return (velocity + acceleration > maxVelocity) ? maxVelocity : velocity + acceleration;
    }
}

let events = [];

io.on('connection', function (socket) {
    Game.users.push({
        x: SCENE_WIDTH / 2,
        y: SCENE_HEIGHT / 2,
        velocity: {
            x: 0,
            y: 0,
        },
        kick: false,
        maxVelocity: MAX_VELOCITY,
        socket,
    });

    socket.on('direction', function (data) {
        if (data) {
            events.push({data, id: socket.id});
        }
    });

    socket.on('disconnect', function () {
        Game.users.splice(
            Game.users.findIndex(user => user.socket.id === socket.id),
            1,
        );
    });
});

setInterval(function () {
    // console.log(Game.users);
    // console.time()
    events.forEach(event => {
            const { up, left, right, down, kick } = event.data;
            const user = Game.users.find(u => u.socket.id === event.id);
            if (!user) return; 

            if (kick) {
                user.kick = true;
                user.maxVelocity = 2;
            } else {
                user.kick = false;
                user.maxVelocity = MAX_VELOCITY;
            }

            if (up && down || !(up || down)) {
                if (user.velocity.y > 0) user.velocity.y = calculateStopSpeed(-1, Game.acceleration * Game.friction, user.velocity.y);
                else if (user.velocity.y < 0) user.velocity.y = calculateStopSpeed(1, Game.acceleration * Game.friction, user.velocity.y);
            } else if (up || down) {
                user.velocity.y = calculateSpeed(up ? -1 : 1, Game.acceleration * Game.friction, user.velocity.y, user.maxVelocity);
            }

            if (left && right || !(left || right)) {
                if (user.velocity.x > 0) user.velocity.x = calculateStopSpeed(-1, Game.acceleration * Game.friction, user.velocity.x);
                else if (user.velocity.x < 0) user.velocity.x = calculateStopSpeed(1, Game.acceleration * Game.friction, user.velocity.x);
            } else if (left || right) {
                user.velocity.x = calculateSpeed(left ? -1 : 1, Game.acceleration * Game.friction, user.velocity.x, user.maxVelocity);
            }

            user.y += user.velocity.y;
            user.x += user.velocity.x;
    });



    Game.users.forEach(user => {
        user.socket.emit(
            'position',
            {
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
                }
            });
    });

    // console.timeEnd()

    events = [];
}, 1000 / 60);
