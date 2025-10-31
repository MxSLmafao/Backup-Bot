require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createBackup } = require('./backup');
const { restoreBackup } = require('./restore');

// Load configuration from environment variables
if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    console.error('Error: Missing required environment variables.');
    console.error('Please copy .env.example to .env and fill in your Discord bot token and client ID.');
    process.exit(1);
}

// Default backup path in project directory (one level up from src/)
const DEFAULT_BACKUP_PATH = path.join(__dirname, '..', 'backups');

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    backupPath: process.env.BACKUP_PATH || DEFAULT_BACKUP_PATH
};

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// Ensure backup directory exists (resolve to absolute path)
const backupPath = path.isAbsolute(config.backupPath)
    ? config.backupPath
    : path.join(__dirname, '..', config.backupPath);
if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
}

// Bot ready event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`💾 Backup path: ${backupPath}`);
    console.log(`\n📝 Available slash commands:`);
    console.log(`  /backup - Create a backup of the server`);
    console.log(`  /restore <backup-id> - Restore a backup`);
    console.log(`  /list - List all available backups`);
    console.log(`  /help - Show help message`);
    console.log(`\n💡 If commands don't appear, run: npm run deploy`);
});

// Interaction handler (slash commands)
client.on('interactionCreate', async (interaction) => {
    // Handle autocomplete for backup-id option
    if (interaction.isAutocomplete()) {
        return handleAutocomplete(interaction);
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        try {
            switch (interaction.commandName) {
                case 'backup':
                    await handleBackup(interaction);
                    break;

                case 'restore':
                    await handleRestore(interaction);
                    break;

                case 'list':
                    await handleList(interaction);
                    break;

                case 'help':
                    await handleHelp(interaction);
                    break;
            }
        } catch (error) {
            console.error('Command error:', error);
            const errorMessage = `❌ An error occurred: ${error.message}`;

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    // Handle button interactions (for restore confirmation)
    if (interaction.isButton()) {
        await handleButton(interaction);
    }
});

// Autocomplete handler for backup IDs
async function handleAutocomplete(interaction) {
    if (interaction.commandName === 'restore') {
        const guildId = interaction.guild.id;
        const focusedValue = interaction.options.getFocused().toLowerCase();

        // Get all backup files for this guild (support both .json.gz and .json)
        const files = fs.readdirSync(backupPath)
            .filter(file => file.startsWith(guildId) && (file.endsWith('.json.gz') || file.endsWith('.json')))
            .sort()
            .reverse();

        // Filter and format choices
        const choices = files
            .map(file => {
                const backupId = file.replace('.json.gz', '').replace('.json', '');
                const timestamp = parseInt(backupId.split('_')[1]);
                const date = new Date(timestamp);

                // Get file size
                const filePath = path.join(backupPath, file);
                const stats = fs.statSync(filePath);
                const sizeKB = (stats.size / 1024).toFixed(1);

                return {
                    name: `${date.toLocaleString()} - ${sizeKB}KB`,
                    value: backupId
                };
            })
            .filter(choice => choice.value.toLowerCase().includes(focusedValue))
            .slice(0, 25); // Discord limits to 25 choices

        await interaction.respond(choices);
    }
}

// Backup command handler
async function handleBackup(interaction) {
    await interaction.deferReply();

    try {
        const guild = interaction.guild;
        const backup = await createBackup(guild);

        // Generate backup ID (timestamp-based)
        const backupId = `${guild.id}_${Date.now()}`;
        const backupFile = path.join(backupPath, `${backupId}.json.gz`);

        // Convert backup to JSON and compress with gzip
        const jsonData = JSON.stringify(backup, null, 2);
        const compressed = zlib.gzipSync(jsonData);

        // Save compressed backup to file
        fs.writeFileSync(backupFile, compressed);

        // Calculate file sizes for display
        const originalSize = (Buffer.byteLength(jsonData) / 1024).toFixed(1);
        const compressedSize = (compressed.length / 1024).toFixed(1);
        const compressionRatio = ((1 - compressed.length / Buffer.byteLength(jsonData)) * 100).toFixed(0);

        await interaction.editReply(
            `✅ Backup created successfully!\n` +
            `📦 Backup ID: \`${backupId}\`\n` +
            `💾 File: \`${backupId}.json.gz\`\n` +
            `📊 Size: ${compressedSize}KB (${compressionRatio}% compression from ${originalSize}KB)`
        );
    } catch (error) {
        console.error('Backup error:', error);
        await interaction.editReply(`❌ Failed to create backup: ${error.message}`);
    }
}

// Restore command handler
async function handleRestore(interaction) {
    const backupId = interaction.options.getString('backup-id');

    // Check for both compressed and uncompressed backup files
    let backupFile = path.join(backupPath, `${backupId}.json.gz`);
    if (!fs.existsSync(backupFile)) {
        // Fallback to uncompressed for backwards compatibility
        backupFile = path.join(backupPath, `${backupId}.json`);
        if (!fs.existsSync(backupFile)) {
            return interaction.reply({
                content: `❌ Backup not found: \`${backupId}\``,
                ephemeral: true
            });
        }
    }

    // Create confirmation buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`restore_confirm_${backupId}`)
                .setLabel('✅ Confirm Restore')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('restore_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        content: '⚠️ **WARNING**: Restoring a backup will DELETE all current channels and roles!\nClick the button below to confirm within 30 seconds.',
        components: [row],
        ephemeral: true
    });
}

// Button interaction handler
async function handleButton(interaction) {
    if (interaction.customId.startsWith('restore_confirm_')) {
        const backupId = interaction.customId.replace('restore_confirm_', '');

        // Check for both compressed and uncompressed backup files
        let backupFile = path.join(backupPath, `${backupId}.json.gz`);
        let isCompressed = fs.existsSync(backupFile);

        if (!isCompressed) {
            // Fallback to uncompressed for backwards compatibility
            backupFile = path.join(backupPath, `${backupId}.json`);
        }

        await interaction.update({
            content: '🔄 Restoring backup... This may take several minutes. Please be patient!',
            components: []
        });

        try {
            // Load and decompress backup data
            let backupData;
            if (isCompressed) {
                const compressedData = fs.readFileSync(backupFile);
                const decompressed = zlib.gunzipSync(compressedData);
                backupData = JSON.parse(decompressed.toString('utf-8'));
            } else {
                backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
            }

            // Restore the backup
            await restoreBackup(interaction.guild, backupData);

            await interaction.editReply({
                content: '✅ Backup restored successfully!',
                components: []
            });
        } catch (error) {
            console.error('Restore error:', error);
            await interaction.editReply({
                content: `❌ Failed to restore backup: ${error.message}`,
                components: []
            });
        }
    } else if (interaction.customId === 'restore_cancel') {
        await interaction.update({
            content: '❌ Restore cancelled.',
            components: []
        });
    }
}

// List backups command handler
async function handleList(interaction) {
    const guildId = interaction.guild.id;

    // Get all backup files for this guild (support both .json.gz and .json)
    const files = fs.readdirSync(backupPath)
        .filter(file => file.startsWith(guildId) && (file.endsWith('.json.gz') || file.endsWith('.json')))
        .sort()
        .reverse();

    if (files.length === 0) {
        return interaction.reply({
            content: '📋 No backups found for this server.',
            ephemeral: true
        });
    }

    // Format backup list
    const backupList = files.slice(0, 10).map((file, index) => {
        const backupId = file.replace('.json.gz', '').replace('.json', '');
        const timestamp = parseInt(backupId.split('_')[1]);
        const date = new Date(timestamp);

        // Get file size
        const filePath = path.join(backupPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        const compressed = file.endsWith('.json.gz') ? ' 🗜️' : '';

        return `${index + 1}. \`${backupId}\`${compressed}\n   📅 ${date.toLocaleString()} • 💾 ${sizeKB}KB`;
    }).join('\n\n');

    await interaction.reply({
        content: `📋 **Available Backups** (showing last 10):\n\n${backupList}\n\nUse \`/restore\` to restore a backup.\n🗜️ = Compressed`,
        ephemeral: true
    });
}

// Help command handler
async function handleHelp(interaction) {
    const helpText = `
**📚 Discord Backup Bot - Help**

**Commands:**
\`/backup\` - Create a complete backup of the server
\`/restore <backup-id>\` - Restore a backup by ID (with autocomplete)
\`/list\` - List all available backups
\`/help\` - Show this help message

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

    await interaction.reply({ content: helpText, ephemeral: true });
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
