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
    maxVelocity: 6,
    minVelocity: 0,
    acceleration: 1,
    users: [],
};

io.on('connection', function(socket) {
    Game.users.push({
        x: config.SCENE_WIDTH / 2,
        y: config.SCENE_HEIGHT / 2,
        currSpeed: 0,
        lastDirection: [],
        socket,
    });

    socket.on('direction', function(data) {
        if (data) {
            Game.users.forEach(user => {
                if (user.socket.id == socket.id) {
                    if (data.length > 0) {
                        user.lastDirection = data;
                        if (user.currSpeed + Game.acceleration > Game.maxVelocity) user.currSpeed = Game.maxVelocity;
                        else user.currSpeed = user.currSpeed + Game.acceleration / 3;

                        if (data.includes('up')) user.y -= user.currSpeed;
                        if (data.includes('down')) user.y += user.currSpeed;
                        if (data.includes('left')) user.x -= user.currSpeed;
                        if (data.includes('right')) user.x += user.currSpeed;
                    } else {
                        if (user.currSpeed - Game.acceleration < Game.minVelocity) user.currSpeed = Game.minVelocity;
                        else user.currSpeed = user.currSpeed - Game.acceleration / 5;

                        if (user.lastDirection.includes('up')) user.y -= user.currSpeed;
                        if (user.lastDirection.includes('down')) user.y += user.currSpeed;
                        if (user.lastDirection.includes('left')) user.x -= user.currSpeed;
                        if (user.lastDirection.includes('right')) user.x += user.currSpeed;

                        if (user.currSpeed === 0) user.lastDirection = [];
                    }
                }
            });
        }
    });

    socket.on('disconnect', function() {
        Game.users.splice(Game.users.findIndex(user => user.socket.id === socket.id), 1);
    });
});

setInterval(function() {
    Game.users.forEach(user => {
        user.socket.emit(
            'position',
            Game.users.map(user => {
                return {
                    x: user.x,
                    y: user.y,
                    id: user.socket.id,
                };
            }),
        );
    });
}, 1000 / 60);
