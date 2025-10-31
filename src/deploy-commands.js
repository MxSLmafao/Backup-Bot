require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

// Load configuration from environment variables
if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    console.error('Error: Missing required environment variables.');
    console.error('Please copy .env.example to .env and fill in your Discord bot token and client ID.');
    process.exit(1);
}

// Prepare commands for deployment
const commandsData = commands.map(command => command.toJSON());

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commandsData.length} application (/) commands.`);

        // Register commands globally (takes up to 1 hour to propagate)
        // For instant updates during development, use guild-specific commands instead
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commandsData },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        console.log('\nRegistered commands:');
        data.forEach(cmd => {
            console.log(`  /${cmd.name} - ${cmd.description}`);
        });
        console.log('\n⚠️  Note: Global commands may take up to 1 hour to appear in Discord.');
        console.log('💡 For instant updates during development, modify the script to use guild commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
})();
