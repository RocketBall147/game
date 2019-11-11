const config = require('./gameconfig.js');

const express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(8000, 'localhost');
// WARNING: app.listen(80) will NOT work here!
app.use(express.static('.'));

const Game = {
    minX: 0,
    minY: 0,
    maxX: config.SCENE_WIDTH,
    maxY: config.SCENE_HEIGHT,
    maxVelocity: 3,
    minVelocity: 0,
    acceleration: 0.5,
    users: [],
};

const calculateSpeed = (dir, acceleration, speed) => {
    return (dir < 0) ? (speed - acceleration < -Game.maxVelocity) ? -Game.maxVelocity : speed - acceleration : (speed + acceleration > Game.maxVelocity) ? Game.maxVelocity : speed + acceleration;
}

const calculateStopSpeed = (dir, acceleration, speed) => {
    return (dir < 0) ? (speed - acceleration < 0) ? 0 : speed - acceleration : (speed + acceleration > 0) ? 0 : speed + acceleration;
}

io.on('connection', function (socket) {
    Game.users.push({
        x: config.SCENE_WIDTH / 2,
        y: config.SCENE_HEIGHT / 2,
        speed: {
            x: 0,
            y: 0,
        },
        kick: false,
        socket,
    });

    socket.on('direction', function (data) {
        if (data) {
            Game.users.forEach(user => {
                if (user.socket.id == socket.id) {
                    if (data.includes('up') && data.includes('down') || !data.includes('up') && !data.includes('down')) {
                        if (user.speed.y > 0) user.speed.y = calculateStopSpeed(-1, Game.acceleration / 5, user.speed.y);
                        else if (user.speed.y < 0) user.speed.y = calculateStopSpeed(1, Game.acceleration / 5, user.speed.y);
                        user.y += user.speed.y;
                    } else if (data.includes('up') || data.includes('down')) {
                        user.speed.y = calculateSpeed(data.includes('up') ? -1 : 1, Game.acceleration / 5, user.speed.y);
                        user.y += user.speed.y;
                    }

                    if (data.includes('left') && data.includes('right') || !data.includes('left') && !data.includes('right')) {
                        if (user.speed.x > 0) user.speed.x = calculateStopSpeed(-1, Game.acceleration / 5, user.speed.x);
                        else if (user.speed.x < 0) user.speed.x = calculateStopSpeed(1, Game.acceleration / 5, user.speed.x);
                        user.x += user.speed.x;
                    } else if (data.includes('left') || data.includes('right')) {
                        user.speed.x = calculateSpeed(data.includes('left') ? -1 : 1, Game.acceleration / 5, user.speed.x);
                        user.x += user.speed.x;
                    }

                    if (data.includes('kick')) {
                        user.kick = true;
                    } else {
                        user.kick = false;
                    }
                }
            });
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
    Game.users.forEach(user => {
        user.socket.emit(
            'position',
            Game.users.map(user => {
                return {
                    x: user.x,
                    y: user.y,
                    id: user.socket.id,
                    kick: user.kick,
                };
            }),
        );
    });
}, 1000 / 60);
