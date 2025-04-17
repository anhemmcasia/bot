const mineflayer = require('mineflayer');

const host = process.argv[2];
const port = parseInt(process.argv[3]);
const username = process.argv[4];

const bot = mineflayer.createBot({ host, port, username });

bot.once('spawn', () => {
  console.log(`${username} đã vào server ${host}:${port}`);
  setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 500);
  }, 10000);
});

bot.on('end', () => {
  console.log(`${username} đã bị ngắt kết nối.`);
});

bot.on('error', err => {
  console.log(`${username} lỗi: ${err.message}`);
});
