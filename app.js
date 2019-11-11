const express = require('express')
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);


server.listen(8000, '157.230.18.240');
// WARNING: app.listen(80) will NOT work here!
app.use(express.static('.'));

const Game = {
    minX: 0,
    minY: 0,
    maxX: 640 * 2,
    maxY: 480 * 2,
    users: []
};
io.on('connection', function (socket) {
    Game.users.push({
        x: 20,
        y: 20,
        socket: socket
    });

    socket.on('direction', function (data) {
        if (data){
        Game.users.forEach(user => {
            if (user.socket.id == socket.id) {
                if (data.includes('up')) user.y -= 2;
                if (data.includes('down')) user.y += 2;
                if (data.includes('left')) user.x -= 2;
                if (data.includes('right')) user.x += 2;
            }
        })
    };
    });

    
});

setInterval(function () {
    Game.users.forEach(user => {
        user.socket.emit('position', Game.users.map(user => {
            return {
                x: user.x,
                y: user.y,
                id: user.socket.id
            }
        }));
    });
}, 1000/128)
