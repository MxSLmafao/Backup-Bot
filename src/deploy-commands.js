const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

// Load configuration
let config;
try {
    config = require('../config.json');
} catch (error) {
    console.error('Error: config.json not found. Please copy config.example.json to config.json and fill in your bot token.');
    process.exit(1);
}

// Prepare commands for deployment
const commandsData = commands.map(command => command.toJSON());

// Create REST instance
const rest = new REST({ version: '10' }).setToken(config.token);

// Deploy commands
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commandsData.length} application (/) commands.`);

        // Register commands globally (takes up to 1 hour to propagate)
        // For instant updates during development, use guild-specific commands instead
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
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
