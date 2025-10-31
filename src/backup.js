const { ChannelType } = require('discord.js');

/**
 * Creates a complete backup of a Discord guild
 * @param {Guild} guild - The Discord guild to backup
 * @returns {Object} Backup data object
 */
async function createBackup(guild) {
    console.log(`Creating backup for guild: ${guild.name} (${guild.id})`);

    const backup = {
        metadata: {
            backupVersion: '1.0.0',
            guildId: guild.id,
            guildName: guild.name,
            timestamp: new Date().toISOString(),
            memberCount: guild.memberCount
        },
        guild: await backupGuildSettings(guild),
        roles: await backupRoles(guild),
        channels: await backupChannels(guild),
        emojis: await backupEmojis(guild)
    };

    console.log('Backup created successfully');
    return backup;
}

/**
 * Backup guild settings
 */
async function backupGuildSettings(guild) {
    console.log('Backing up guild settings...');

    return {
        name: guild.name,
        description: guild.description,
        icon: guild.iconURL({ size: 2048 }),
        banner: guild.bannerURL({ size: 2048 }),
        splash: guild.splashURL({ size: 2048 }),
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        afkTimeout: guild.afkTimeout,
        systemChannelFlags: guild.systemChannelFlags?.bitfield,
        preferredLocale: guild.preferredLocale,
        features: guild.features
    };
}

/**
 * Backup all roles
 */
async function backupRoles(guild) {
    console.log('Backing up roles...');

    const roles = [];

    // Sort roles by position (lowest to highest)
    const sortedRoles = Array.from(guild.roles.cache.values())
        .sort((a, b) => a.position - b.position);

    for (const role of sortedRoles) {
        // Skip @everyone role (it can't be deleted/recreated)
        if (role.id === guild.id) continue;

        roles.push({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            position: role.position,
            permissions: role.permissions.bitfield.toString(),
            mentionable: role.mentionable,
            icon: role.iconURL({ size: 256 }),
            unicodeEmoji: role.unicodeEmoji
        });
    }

    console.log(`Backed up ${roles.length} roles`);
    return roles;
}

/**
 * Backup all channels
 */
async function backupChannels(guild) {
    console.log('Backing up channels...');

    const channels = [];

    // Sort channels by position
    const sortedChannels = Array.from(guild.channels.cache.values())
        .sort((a, b) => a.position - b.position);

    for (const channel of sortedChannels) {
        const baseData = {
            name: channel.name,
            type: channel.type,
            position: channel.position,
            permissionOverwrites: await backupPermissionOverwrites(channel, guild)
        };

        // Add type-specific properties
        if (channel.type === ChannelType.GuildCategory) {
            channels.push({
                ...baseData,
                category: true
            });
        } else if (channel.type === ChannelType.GuildText) {
            channels.push({
                ...baseData,
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser,
                parent: channel.parent?.name || null,
                defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration
            });
        } else if (channel.type === ChannelType.GuildVoice) {
            channels.push({
                ...baseData,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                parent: channel.parent?.name || null,
                rtcRegion: channel.rtcRegion
            });
        } else if (channel.type === ChannelType.GuildAnnouncement) {
            channels.push({
                ...baseData,
                topic: channel.topic,
                nsfw: channel.nsfw,
                parent: channel.parent?.name || null,
                defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration
            });
        } else if (channel.type === ChannelType.GuildStageVoice) {
            channels.push({
                ...baseData,
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                parent: channel.parent?.name || null,
                rtcRegion: channel.rtcRegion
            });
        } else if (channel.type === ChannelType.GuildForum) {
            channels.push({
                ...baseData,
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser,
                parent: channel.parent?.name || null,
                defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration
            });
        } else {
            // For any other channel type, save basic data
            channels.push({
                ...baseData,
                parent: channel.parent?.name || null
            });
        }
    }

    console.log(`Backed up ${channels.length} channels`);
    return channels;
}

/**
 * Backup permission overwrites for a channel
 */
async function backupPermissionOverwrites(channel, guild) {
    const overwrites = [];

    for (const overwrite of channel.permissionOverwrites.cache.values()) {
        const data = {
            id: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.bitfield.toString(),
            deny: overwrite.deny.bitfield.toString()
        };

        // Store role/user name for reference
        if (overwrite.type === 0) { // Role
            const role = guild.roles.cache.get(overwrite.id);
            data.roleName = role ? role.name : 'Unknown Role';
        } else if (overwrite.type === 1) { // Member
            data.userId = overwrite.id;
        }

        overwrites.push(data);
    }

    return overwrites;
}

/**
 * Backup emojis
 */
async function backupEmojis(guild) {
    console.log('Backing up emojis...');

    const emojis = [];

    for (const emoji of guild.emojis.cache.values()) {
        emojis.push({
            name: emoji.name,
            url: emoji.imageURL({ size: 256 }),
            animated: emoji.animated,
            roles: emoji.roles.cache.map(r => r.name)
        });
    }

    console.log(`Backed up ${emojis.length} emojis`);
    return emojis;
}

module.exports = { createBackup };
