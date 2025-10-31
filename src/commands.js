const { SlashCommandBuilder } = require('discord.js');

/**
 * Define all slash commands for the bot
 */
const commands = [
    new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Create a complete backup of the server')
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    new SlashCommandBuilder()
        .setName('restore')
        .setDescription('Restore the server from a backup')
        .setDefaultMemberPermissions(0x0000000000000008) // Administrator permission
        .addStringOption(option =>
            option
                .setName('backup-id')
                .setDescription('The backup ID to restore')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    new SlashCommandBuilder()
        .setName('backup-channels')
        .setDescription('Create a backup of channels only (no roles or server settings)')
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    new SlashCommandBuilder()
        .setName('restore-channels')
        .setDescription('Restore only channels from a backup')
        .setDefaultMemberPermissions(0x0000000000000008) // Administrator permission
        .addStringOption(option =>
            option
                .setName('backup-id')
                .setDescription('The backup ID to restore channels from')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all available backups for this server')
        .setDefaultMemberPermissions(0x0000000000000008), // Administrator permission

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information about the backup bot')
];

module.exports = { commands };
