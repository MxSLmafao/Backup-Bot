const { ChannelType, PermissionOverwriteManager } = require('discord.js');
const https = require('https');

/**
 * Restores a guild from backup data
 * @param {Guild} guild - The Discord guild to restore to
 * @param {Object} backupData - The backup data object
 */
async function restoreBackup(guild, backupData) {
    console.log(`Starting restore for guild: ${guild.name} (${guild.id})`);

    // Step 1: Delete existing channels and roles
    await deleteExistingChannels(guild);
    await deleteExistingRoles(guild);

    // Step 2: Restore guild settings
    await restoreGuildSettings(guild, backupData.guild);

    // Step 3: Restore roles (must be done before channels for permissions)
    const roleMap = await restoreRoles(guild, backupData.roles);

    // Step 4: Restore channels
    await restoreChannels(guild, backupData.channels, roleMap);

    // Step 5: Restore emojis
    await restoreEmojis(guild, backupData.emojis);

    console.log('Restore completed successfully');
}

/**
 * Delete all existing channels (except system channels)
 */
async function deleteExistingChannels(guild) {
    console.log('Deleting existing channels...');

    const channels = Array.from(guild.channels.cache.values());
    for (const channel of channels) {
        try {
            await channel.delete('Preparing for backup restore');
            await sleep(100); // Rate limit protection
        } catch (error) {
            console.error(`Failed to delete channel ${channel.name}:`, error.message);
        }
    }

    console.log('Existing channels deleted');
}

/**
 * Delete all existing roles (except @everyone and managed roles)
 */
async function deleteExistingRoles(guild) {
    console.log('Deleting existing roles...');

    const roles = Array.from(guild.roles.cache.values())
        .filter(role => role.id !== guild.id && !role.managed) // Skip @everyone and managed roles
        .sort((a, b) => b.position - a.position); // Delete from highest to lowest

    for (const role of roles) {
        try {
            await role.delete('Preparing for backup restore');
            await sleep(100); // Rate limit protection
        } catch (error) {
            console.error(`Failed to delete role ${role.name}:`, error.message);
        }
    }

    console.log('Existing roles deleted');
}

/**
 * Restore guild settings
 */
async function restoreGuildSettings(guild, settings) {
    console.log('Restoring guild settings...');

    try {
        const updateData = {
            name: settings.name,
            verificationLevel: settings.verificationLevel,
            defaultMessageNotifications: settings.defaultMessageNotifications,
            explicitContentFilter: settings.explicitContentFilter,
            afkTimeout: settings.afkTimeout,
            preferredLocale: settings.preferredLocale
        };

        // Add description if available
        if (settings.description) {
            updateData.description = settings.description;
        }

        // Download and set icon if available
        if (settings.icon) {
            const iconBuffer = await downloadImage(settings.icon);
            if (iconBuffer) {
                updateData.icon = iconBuffer;
            }
        }

        // Download and set banner if available (requires boost level 2)
        if (settings.banner) {
            const bannerBuffer = await downloadImage(settings.banner);
            if (bannerBuffer) {
                updateData.banner = bannerBuffer;
            }
        }

        // Download and set splash if available (requires partnered or verified)
        if (settings.splash) {
            const splashBuffer = await downloadImage(settings.splash);
            if (splashBuffer) {
                updateData.splash = splashBuffer;
            }
        }

        await guild.edit(updateData);
        console.log('Guild settings restored');
    } catch (error) {
        console.error('Error restoring guild settings:', error.message);
    }
}

/**
 * Restore roles
 * Returns a map of old role names to new role objects
 */
async function restoreRoles(guild, roles) {
    console.log('Restoring roles...');

    const roleMap = new Map();
    roleMap.set('@everyone', guild.roles.everyone);

    // Create roles in order (lowest position first)
    for (const roleData of roles) {
        try {
            const createData = {
                name: roleData.name,
                color: roleData.color || 0,
                hoist: roleData.hoist,
                permissions: BigInt(roleData.permissions),
                mentionable: roleData.mentionable
            };

            // Add unicode emoji if available
            if (roleData.unicodeEmoji) {
                createData.unicodeEmoji = roleData.unicodeEmoji;
            }

            const newRole = await guild.roles.create(createData);
            roleMap.set(roleData.name, newRole);

            await sleep(200); // Rate limit protection
        } catch (error) {
            console.error(`Failed to create role ${roleData.name}:`, error.message);
        }
    }

    // Update role positions (must be done after all roles are created)
    console.log('Updating role positions...');
    const positionUpdates = [];

    for (const roleData of roles) {
        const role = roleMap.get(roleData.name);
        if (role && role.editable) {
            positionUpdates.push({
                role: role,
                position: roleData.position
            });
        }
    }

    // Only update positions if there are roles to update
    if (positionUpdates.length > 0) {
        try {
            await guild.roles.setPositions(positionUpdates);
            console.log('Role positions updated');
        } catch (error) {
            // This can fail if the bot doesn't have permission to move roles above its own position
            console.error('Could not restore role positions:', error.message);
            console.log('Note: Role hierarchy may differ from backup due to permission limitations');
        }
    }

    console.log(`Restored ${roleMap.size - 1} roles`);
    return roleMap;
}

/**
 * Restore channels
 */
async function restoreChannels(guild, channels, roleMap) {
    console.log('Restoring channels...');

    const channelMap = new Map();

    // First pass: Create all categories
    for (const channelData of channels) {
        if (channelData.category) {
            try {
                const newChannel = await guild.channels.create({
                    name: channelData.name,
                    type: ChannelType.GuildCategory,
                    position: channelData.position,
                    permissionOverwrites: restorePermissionOverwrites(channelData.permissionOverwrites, roleMap)
                });

                channelMap.set(channelData.name, newChannel);
                await sleep(200); // Rate limit protection
            } catch (error) {
                console.error(`Failed to create category ${channelData.name}:`, error.message);
            }
        }
    }

    // Second pass: Create all other channels
    for (const channelData of channels) {
        if (channelData.category) continue; // Skip categories

        try {
            // Convert deprecated channel types
            let channelType = channelData.type;

            // Type 5 (GuildAnnouncement) is deprecated, convert to GuildText (0)
            // Announcement features are now handled differently in Discord
            if (channelType === 5) {
                channelType = 0; // GuildText
            }

            const createData = {
                name: channelData.name,
                type: channelType,
                position: channelData.position,
                permissionOverwrites: restorePermissionOverwrites(channelData.permissionOverwrites, roleMap)
            };

            // Set parent category if exists
            if (channelData.parent) {
                const parentChannel = channelMap.get(channelData.parent);
                if (parentChannel) {
                    createData.parent = parentChannel.id;
                }
            }

            // Add type-specific properties
            // Type 0 = GuildText, Type 5 = GuildAnnouncement (deprecated, treat as text)
            if (channelType === 0 || channelData.type === 5) {
                if (channelData.topic) createData.topic = channelData.topic;
                if (channelData.nsfw !== undefined) createData.nsfw = channelData.nsfw;
                if (channelData.rateLimitPerUser) createData.rateLimitPerUser = channelData.rateLimitPerUser;
                if (channelData.defaultAutoArchiveDuration) createData.defaultAutoArchiveDuration = channelData.defaultAutoArchiveDuration;
            } else if (channelType === 2 || channelType === 13) { // GuildVoice or GuildStageVoice
                if (channelData.bitrate) createData.bitrate = channelData.bitrate;
                if (channelData.userLimit) createData.userLimit = channelData.userLimit;
                if (channelData.rtcRegion) createData.rtcRegion = channelData.rtcRegion;
            } else if (channelType === 15) { // GuildForum
                if (channelData.topic) createData.topic = channelData.topic;
                if (channelData.nsfw !== undefined) createData.nsfw = channelData.nsfw;
                if (channelData.rateLimitPerUser) createData.rateLimitPerUser = channelData.rateLimitPerUser;
                if (channelData.defaultAutoArchiveDuration) createData.defaultAutoArchiveDuration = channelData.defaultAutoArchiveDuration;
            }

            const newChannel = await guild.channels.create(createData);
            channelMap.set(channelData.name, newChannel);

            await sleep(200); // Rate limit protection
        } catch (error) {
            console.error(`Failed to create channel ${channelData.name}:`, error.message);
        }
    }

    console.log(`Restored ${channelMap.size} channels`);
}

/**
 * Restore permission overwrites
 */
function restorePermissionOverwrites(overwrites, roleMap) {
    const permissionOverwrites = [];

    for (const overwrite of overwrites) {
        // For role overwrites, map old role name to new role
        if (overwrite.type === 0 && overwrite.roleName) {
            const role = roleMap.get(overwrite.roleName);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    type: overwrite.type,
                    allow: BigInt(overwrite.allow),
                    deny: BigInt(overwrite.deny)
                });
            }
        }
        // For user overwrites, keep the original user ID
        else if (overwrite.type === 1) {
            permissionOverwrites.push({
                id: overwrite.id,
                type: overwrite.type,
                allow: BigInt(overwrite.allow),
                deny: BigInt(overwrite.deny)
            });
        }
    }

    return permissionOverwrites;
}

/**
 * Restore emojis
 */
async function restoreEmojis(guild, emojis) {
    console.log('Restoring emojis...');

    let restored = 0;

    for (const emojiData of emojis) {
        try {
            await guild.emojis.create({
                attachment: emojiData.url,
                name: emojiData.name
            });

            restored++;
            await sleep(300); // Rate limit protection
        } catch (error) {
            console.error(`Failed to create emoji ${emojiData.name}:`, error.message);
        }
    }

    console.log(`Restored ${restored}/${emojis.length} emojis`);
}

/**
 * Download an image from a URL
 */
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                resolve(null);
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', () => resolve(null));
        }).on('error', () => resolve(null));
    });
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { restoreBackup };
