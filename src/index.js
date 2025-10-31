const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createBackup } = require('./backup');
const { restoreBackup } = require('./restore');

// Load configuration
let config;
try {
    config = require('../config.json');
} catch (error) {
    console.error('Error: config.json not found. Please copy config.example.json to config.json and fill in your bot token.');
    process.exit(1);
}

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites
    ]
});

// Ensure backup directory exists
const backupPath = path.resolve(config.backupPath || './backups');
if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`📋 Prefix: ${config.prefix}`);
    console.log(`💾 Backup path: ${backupPath}`);
    console.log(`\n📝 Available commands:`);
    console.log(`  ${config.prefix}backup - Create a backup of the server`);
    console.log(`  ${config.prefix}restore <backup-id> - Restore a backup`);
    console.log(`  ${config.prefix}list - List all available backups`);
    console.log(`  ${config.prefix}help - Show help message`);
});

// Message handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages and messages without prefix
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    // Parse command and arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Check if user has administrator permission
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ You need Administrator permission to use this bot.');
    }

    try {
        switch (command) {
            case 'backup':
                await handleBackup(message);
                break;

            case 'restore':
                await handleRestore(message, args);
                break;

            case 'list':
                await handleList(message);
                break;

            case 'help':
                await handleHelp(message);
                break;

            default:
                await message.reply(`❌ Unknown command. Use \`${config.prefix}help\` for available commands.`);
        }
    } catch (error) {
        console.error('Command error:', error);
        await message.reply(`❌ An error occurred: ${error.message}`);
    }
});

// Backup command handler
async function handleBackup(message) {
    const loadingMsg = await message.reply('🔄 Creating backup... This may take a while.');

    try {
        const guild = message.guild;
        const backup = await createBackup(guild);

        // Generate backup ID (timestamp-based)
        const backupId = `${guild.id}_${Date.now()}`;
        const backupFile = path.join(backupPath, `${backupId}.json`);

        // Save backup to file
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        await loadingMsg.edit(`✅ Backup created successfully!\n📦 Backup ID: \`${backupId}\`\n💾 File: \`${backupId}.json\``);
    } catch (error) {
        console.error('Backup error:', error);
        await loadingMsg.edit(`❌ Failed to create backup: ${error.message}`);
    }
}

// Restore command handler
async function handleRestore(message, args) {
    if (args.length === 0) {
        return message.reply(`❌ Please provide a backup ID. Use \`${config.prefix}list\` to see available backups.`);
    }

    const backupId = args[0];
    const backupFile = path.join(backupPath, `${backupId}.json`);

    if (!fs.existsSync(backupFile)) {
        return message.reply(`❌ Backup not found: \`${backupId}\``);
    }

    // Confirmation message
    const confirmMsg = await message.reply('⚠️ **WARNING**: Restoring a backup will DELETE all current channels and roles!\nReact with ✅ within 30 seconds to confirm.');
    await confirmMsg.react('✅');

    // Wait for confirmation
    const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === message.author.id;
    const collected = await confirmMsg.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] })
        .catch(() => null);

    if (!collected) {
        return confirmMsg.edit('❌ Restore cancelled - timeout.');
    }

    await confirmMsg.edit('🔄 Restoring backup... This may take several minutes. Please be patient!');

    try {
        // Load backup data
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

        // Restore the backup
        await restoreBackup(message.guild, backupData);

        await confirmMsg.edit('✅ Backup restored successfully!');
    } catch (error) {
        console.error('Restore error:', error);
        await confirmMsg.edit(`❌ Failed to restore backup: ${error.message}`);
    }
}

// List backups command handler
async function handleList(message) {
    const guildId = message.guild.id;

    // Get all backup files for this guild
    const files = fs.readdirSync(backupPath)
        .filter(file => file.startsWith(guildId) && file.endsWith('.json'))
        .sort()
        .reverse();

    if (files.length === 0) {
        return message.reply('📋 No backups found for this server.');
    }

    // Format backup list
    const backupList = files.slice(0, 10).map((file, index) => {
        const backupId = file.replace('.json', '');
        const timestamp = parseInt(backupId.split('_')[1]);
        const date = new Date(timestamp);
        return `${index + 1}. \`${backupId}\` - ${date.toLocaleString()}`;
    }).join('\n');

    await message.reply(`📋 **Available Backups** (showing last 10):\n${backupList}\n\nUse \`${config.prefix}restore <backup-id>\` to restore a backup.`);
}

// Help command handler
async function handleHelp(message) {
    const helpText = `
**📚 Discord Backup Bot - Help**

**Commands:**
\`${config.prefix}backup\` - Create a complete backup of the server
\`${config.prefix}restore <backup-id>\` - Restore a backup by ID
\`${config.prefix}list\` - List all available backups
\`${config.prefix}help\` - Show this help message

**What gets backed up:**
✅ Server settings (name, icon, banner, description)
✅ Roles (with permissions, colors, positions)
✅ Categories and channels (with permissions)
✅ Emojis and stickers
✅ Channel topics, slowmode, NSFW settings
✅ Role hierarchy and mentionability

**Requirements:**
⚠️ You need Administrator permission to use commands
⚠️ The bot needs Administrator permission to restore backups
⚠️ Restoring will DELETE all current channels and roles!

**Note:** Message history, members, and bans are NOT backed up.
    `;

    await message.reply(helpText);
}

// Error handlers
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(config.token).catch((error) => {
    console.error('Failed to login:', error.message);
    process.exit(1);
});
