require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const { fork } = require('child_process');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let persistentData = {};
const runtimeBots = new Map();

// Load persistent data
if (fs.existsSync('user_bots.json')) {
  persistentData = JSON.parse(fs.readFileSync('user_bots.json', 'utf-8'));
}

const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Tạo bot treo Minecraft')
    .addStringOption(opt => opt.setName('server').setDescription('IP:Port server').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số lượng bot').setRequired(true)),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Ngắt tất cả bot Minecraft bạn đã tạo'),
];

client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('✅ Bot Discord đã sẵn sàng!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  if (interaction.commandName === 'start') {
    if (persistentData[userId] && persistentData[userId].active) {
      await interaction.reply({ content: '❗Bạn đã khởi động bot rồi. Hãy dùng /stop trước khi tiếp tục.', ephemeral: true });
      return;
    }
    const server = interaction.options.getString('server');
    const amount = interaction.options.getInteger('amount');
    const [host, portStr] = server.split(':');
    const port = parseInt(portStr);
    if (!host || isNaN(port)) {
      await interaction.reply({ content: '❌ Sai định dạng IP:Port!', ephemeral: true });
      return;
    }
    await interaction.reply(`🔧 Đang tạo ${amount} bot vào **${host}:${port}**...`);
    const bots = [];
    for (let i = 0; i < amount; i++) {
      const botName = `Bot_${userId.slice(0,4)}_${Date.now().toString().slice(-4)}_${i}`;
      const child = fork('mc-bot.js', [host, port, botName]);
      bots.push(child);
    }
    // Save runtime bots and persistent data
    runtimeBots.set(userId, bots);
    persistentData[userId] = { active: true, server, amount };
    fs.writeFileSync('user_bots.json', JSON.stringify(persistentData, null, 2));
    await interaction.followUp(`✅ Đã tạo xong ${amount} bot treo cho bạn.`);
  }

  if (interaction.commandName === 'stop') {
    if (!persistentData[userId] || !persistentData[userId].active) {
      await interaction.reply({ content: '⚠️ Bạn chưa tạo bot nào để dừng.', ephemeral: true });
      return;
    }
    const bots = runtimeBots.get(userId) || [];
    bots.forEach(bot => bot.kill());
    runtimeBots.delete(userId);
    persistentData[userId].active = false;
    fs.writeFileSync('user_bots.json', JSON.stringify(persistentData, null, 2));
    await interaction.reply('✅ Đã dừng toàn bộ bot Minecraft của bạn.');
  }
});

client.login(process.env.DISCORD_TOKEN);
