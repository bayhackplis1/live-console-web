const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const readline = require('readline');
const chalk = require('chalk'); // Para colores en la consola

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Almacenar nombres de usuario, niveles, puntos y historial de mensajes
const users = new Map();
const userLevels = new Map();
const userPoints = new Map();
const chatHistory = []; // Historial de mensajes en memoria

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log(chalk.hex(getRandomColor())(`[+] Nuevo cliente conectado: ${socket.id}`));

    // Enviar historial de chat al nuevo usuario
    socket.emit('chat history', chatHistory);

    // Solicitar nombre de usuario al cliente
    socket.emit('request username');

    // Escuchar el nombre de usuario del cliente
    socket.on('set username', (username) => {
        users.set(socket.id, username);
        userLevels.set(socket.id, 1);
        userPoints.set(socket.id, 0);
        console.log(chalk.hex(getRandomColor())(`[+] Usuario registrado: ${username} (${socket.id})`));
        io.emit('chat message', { text: `[Sistema] ${username} se ha unido al chat.`, type: 'system' });
    });

    // Escuchar mensajes del cliente
    socket.on('chat message', (message) => {
        const username = users.get(socket.id);
        if (username) {
            const messageData = { text: `[${username}]: ${message}`, type: 'user', timestamp: new Date() };
            chatHistory.push(messageData); // Guardar en el historial
            if (chatHistory.length > 100) chatHistory.shift(); // Limitar el historial a 100 mensajes

            console.log(chalk.hex(getRandomColor())(`[Mensaje de ${username}]: ${message}`));
            io.emit('chat message', messageData);

            // Actualizar puntos y niveles
            const currentPoints = userPoints.get(socket.id) + 1;
            userPoints.set(socket.id, currentPoints);
            if (currentPoints % 10 === 0) {
                const currentLevel = userLevels.get(socket.id) + 1;
                userLevels.set(socket.id, currentLevel);
                io.emit('update level', { user: socket.id, level: currentLevel });
            }
        }
    });

    // Manejar la desconexión del cliente
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            console.log(chalk.hex(getRandomColor())(`[-] Usuario desconectado: ${username} (${socket.id})`));
            io.emit('chat message', { text: `[Sistema] ${username} ha abandonado el chat.`, type: 'system' });
            users.delete(socket.id);
        }
    });
});

// Función para generar un color hexadecimal aleatorio
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Configurar la consola para enviar mensajes
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Preguntar por el nombre del administrador al iniciar
let adminName = '';
rl.question(chalk.hex(getRandomColor())('Ingresa tu nombre de administrador: '), (name) => {
    adminName = name;
    console.log(chalk.hex(getRandomColor())(`[+] Bienvenido, ${adminName}. El servidor está activo.`));

    // Escuchar mensajes desde la consola
    rl.on('line', (input) => {
        const message = { text: `[${adminName}]: ${input}`, type: 'admin' }; // Mensaje enviado desde la consola
        chatHistory.push(message); // Guardar en el historial
        if (chatHistory.length > 100) chatHistory.shift(); // Limitar el historial a 100 mensajes
        io.emit('chat message', message); // Enviar a todos los clientes
        console.log(chalk.hex(getRandomColor())(`[Mensaje enviado desde consola]: ${message.text}`));
    });
});

// Iniciar el servidor en un puerto disponible
const PORT = process.env.PORT || 99; // Usar el puerto de la nube o 99 localmente
server.listen(PORT, () => {
    console.log(chalk.hex(getRandomColor())(`[+] Servidor activo en http://localhost:${PORT}`));
});
