# Discord Server Backup Bot

A powerful Discord bot for creating complete backups of Discord servers and restoring them in case of raids, hacks, or accidental deletions. Uses modern Discord slash commands for easy interaction.

## Features

### What Gets Backed Up

✅ **Server Settings**
- Server name, description
- Server icon, banner, splash
- Verification level
- Notification settings
- Content filter settings
- Server features

✅ **Roles**
- Role names and colors
- Role permissions
- Role hierarchy and positions
- Hoisted roles
- Mentionable settings
- Role icons and unicode emojis

✅ **Channels**
- Categories
- Text channels
- Voice channels
- Announcement channels
- Stage channels
- Forum channels
- Channel permissions (overwrites)
- Channel topics, NSFW settings
- Slowmode and auto-archive settings
- Bitrate and user limits (for voice)

✅ **Emojis & Stickers**
- Custom emojis
- Emoji names and URLs
- Animated emojis

### What Does NOT Get Backed Up

❌ Message history
❌ Server members
❌ Bans and moderation logs
❌ Server boosts
❌ Integrations and webhooks
❌ Invites

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v16.11.0 or higher
- A Discord bot token ([How to create a bot](https://discord.com/developers/applications))

### Step 1: Clone the Repository

```bash
git clone https://github.com/MxSLmafao/Backup-Bot.git
cd Backup-Bot
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure the Bot

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your bot token and client ID:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   ```

   **Required Variables:**
   - **DISCORD_TOKEN**: Your bot token from the Developer Portal
   - **DISCORD_CLIENT_ID**: Your application ID (found in "General Information" section)

   **Optional Variables:**
   - **BACKUP_PATH**: Directory for backups (defaults to `backups/` in project directory)
     - You can leave this unset to use the default location
     - Relative paths are resolved from the project directory
     - Absolute paths are also supported

### Step 4: Create Your Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Copy the **Application ID** from "General Information" - this is your `DISCORD_CLIENT_ID`
4. Go to the "Bot" section and click "Add Bot"
5. Under "TOKEN", click "Reset Token" and copy your bot token
6. Paste both the token and client ID into your `.env` file
7. Enable the following **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ⚠️ Message Content Intent is NOT required (we use slash commands)

### Step 5: Invite the Bot to Your Server

1. Go to the "OAuth2" > "URL Generator" section
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands` (required for slash commands)
3. Select bot permissions:
   - ✅ Administrator (recommended for full functionality)
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

### Step 6: Deploy Slash Commands

Before starting the bot, you need to register the slash commands with Discord:

```bash
npm run deploy
```

You should see:
```
🔄 Started refreshing 4 application (/) commands.
✅ Successfully reloaded 4 application (/) commands.

Registered commands:
  /backup - Create a complete backup of the server
  /restore - Restore the server from a backup
  /list - List all available backups for this server
  /help - Show help information about the backup bot
```

⚠️ **Note**: Global commands may take up to 1 hour to appear in all servers. Be patient!

### Step 7: Start the Bot

```bash
npm start
```

You should see:
```
✅ Bot is online as YourBot#1234
💾 Backup path: /path/to/backups

📝 Available slash commands:
  /backup - Create a complete backup of the server
  /restore <backup-id> - Restore a complete backup
  /backup-channels - Create a channels-only backup
  /restore-channels <backup-id> - Restore only channels from a backup
  /list - List all available backups
  /help - Show help message
```

## Usage

### Commands

All commands require **Administrator** permission and use Discord's slash command system.

#### `/backup`
Creates a complete backup of the current server.

Simply type `/backup` and press Enter. The bot will create a compressed backup file in the `backups/` directory with a timestamp-based ID.

**Features:**
- Deferred reply for long operations
- Automatic timestamp-based backup ID
- **Gzip compression** for efficient storage (typically 60-80% smaller)
- Shows compression ratio and file sizes
- Progress indication

#### `/restore <backup-id>`
Restores a server from a backup with autocomplete support.

Type `/restore` and start typing - the bot will show you a list of available backups with dates!

**Features:**
- Autocomplete for backup IDs with file sizes
- Interactive button confirmation (✅ Confirm / ❌ Cancel)
- Shows backup date, time, and size
- Automatic decompression of gzip backups
- Backwards compatible with uncompressed backups
- 30-second timeout for confirmation

⚠️ **WARNING**: This will DELETE all current channels and roles before restoring!

#### `/backup-channels`
Creates a backup of **channels only** (no roles or server settings).

This is useful when you want to backup just your channel structure without affecting roles or server configuration. The backup is much smaller and faster.

**Features:**
- Backs up only channels and their permissions
- Faster backup process
- Smaller file size
- Backup ID includes `_channels` suffix for easy identification
- Gzip compression

**Use cases:**
- Reorganizing channels without affecting roles
- Creating channel templates
- Quick channel structure backups

#### `/restore-channels <backup-id>`
Restores **only channels** from a backup.

This command restores channels from any backup (full or channels-only) but leaves roles and server settings untouched. Existing roles are used for channel permissions.

**Features:**
- Works with both full backups and channels-only backups
- Preserves existing roles and server settings
- Maps channel permissions to existing roles by name
- Interactive button confirmation
- Autocomplete for backup selection

⚠️ **WARNING**: This will DELETE all current channels but will NOT touch roles or server settings!

#### `/list`
Lists all available backups for the current server.

Type `/list` to see the 10 most recent backups with their IDs, timestamps, and file sizes. Compressed backups are marked with 🗜️. The response is ephemeral (only you can see it).

#### `/help`
Displays help information.

Type `/help` to see detailed information about all commands and features. The response is ephemeral (only you can see it).

## Example Workflow

### Creating a Backup

1. Type `/backup` in any channel

2. Press Enter and wait for the bot to complete (may take 10-30 seconds for large servers)

3. The bot will reply with:
   ```
   ✅ Backup created successfully!
   📦 Backup ID: 123456789_1234567890
   💾 File: 123456789_1234567890.json.gz
   📊 Size: 120.5KB (73% compression from 450.2KB)
   ```

4. The compressed backup file is saved in the `backups/` directory

### Restoring a Backup

1. Type `/restore` in any channel

2. Start typing in the backup-id field - you'll see autocomplete suggestions with dates and file sizes

3. Select a backup from the list (or paste a backup ID)

4. Click the **✅ Confirm Restore** button within 30 seconds (or **❌ Cancel** to abort)

5. Wait for the restore to complete (may take several minutes for large servers)

6. The bot will update the message when complete:
   ```
   ✅ Backup restored successfully!
   ```

### Creating a Channels-Only Backup

1. Type `/backup-channels` in any channel

2. The bot will create a backup containing only channels (faster than a full backup)

3. The bot will reply with:
   ```
   ✅ Channels backup created successfully!
   📦 Backup ID: 123456789_1234567890_channels
   💾 File: 123456789_1234567890_channels.json.gz
   📊 Size: 45.2KB (68% compression from 140.8KB)
   📝 Type: Channels only (no roles or server settings)
   ```

### Restoring Channels Only

1. Type `/restore-channels` in any channel

2. Select a backup (can be either a full backup or channels-only backup)

3. Click **✅ Confirm Restore Channels** to proceed

4. The bot will delete and recreate all channels while preserving existing roles and server settings

**Note:** Channel permissions will be mapped to existing roles by name. If a role name doesn't exist, those permissions will be skipped.

## Important Notes

### Permissions

- The bot requires **Administrator** permission to function properly
- Users must have **Administrator** permission to use bot commands
- Some features (like banners) require specific server boost levels

### Rate Limits

- Discord has strict rate limits on API calls
- Large servers (100+ channels/roles) may take several minutes to backup/restore
- The bot includes automatic delays to prevent rate limiting

### Backup Storage

- Backups are stored locally in the `backups/` folder in your project directory
- Each backup file is compressed with **gzip** for efficient storage
- Backup files are named: `{guildId}_{timestamp}.json.gz`
- **Compression**: Typically achieves 60-80% size reduction
  - Example: A 500KB JSON file compresses to ~100KB
  - Large servers: ~1-3 MB compressed (vs 5-15 MB uncompressed)
- **Important**: Consider backing up the `backups/` directory to cloud storage for safety
- You can customize the backup location using the `BACKUP_PATH` environment variable
- **Backwards Compatible**: The bot can still restore old uncompressed `.json` backups

### Limitations

- Cannot backup message history
- Cannot backup server members (privacy reasons)
- Cannot backup webhooks or integrations
- Bot-managed roles (like role bots) cannot be restored
- Server boosts are not included in backups

## Troubleshooting

### Bot is not responding

- Check that the bot is online and has the correct permissions
- Verify your bot token is correct in `.env`
- Make sure you enabled the required intents in the Developer Portal
- Ensure you ran `npm run deploy` to register slash commands

### Restore is failing

- Ensure the bot has Administrator permission
- Check that the backup file exists and is not corrupted
- Verify the bot has permission to delete channels/roles
- Some features require specific server boost levels

### Rate limiting errors

- Wait a few minutes and try again
- For very large servers, the process may take 5-10 minutes
- Consider reducing the number of channels/roles if possible

## Development

### Project Structure

```
Backup-Bot/
├── src/
│   ├── index.js       # Main bot file
│   ├── backup.js      # Backup functionality
│   └── restore.js     # Restore functionality
├── backups/           # Backup files directory
├── config.json        # Bot configuration (not tracked)
├── config.example.json # Example configuration
├── package.json       # Dependencies
├── .gitignore        # Git ignore file
├── LICENSE           # MIT License
└── README.md         # This file
```

### Running in Development Mode

```bash
npm run dev
```

This uses Node.js watch mode to automatically restart on file changes (requires Node.js 18+).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review Discord.js documentation: https://discord.js.org/

## Disclaimer

This bot is for backup and recovery purposes only. Use responsibly and in accordance with Discord's Terms of Service. The authors are not responsible for any misuse of this software.

## Credits

Created by [MxSLmafao](https://github.com/MxSLmafao)

Built with [Discord.js](https://discord.js.org/)
