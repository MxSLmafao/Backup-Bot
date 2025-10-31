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
  /backup - Create a backup of the server
  /restore <backup-id> - Restore a backup
  /list - List all available backups
  /help - Show help message
```

## Usage

### Commands

All commands require **Administrator** permission and use Discord's slash command system.

#### `/backup`
Creates a complete backup of the current server.

Simply type `/backup` and press Enter. The bot will create a backup file in the `backups/` directory with a timestamp-based ID.

**Features:**
- Deferred reply for long operations
- Automatic timestamp-based backup ID
- Progress indication

#### `/restore <backup-id>`
Restores a server from a backup with autocomplete support.

Type `/restore` and start typing - the bot will show you a list of available backups with dates!

**Features:**
- Autocomplete for backup IDs
- Interactive button confirmation (✅ Confirm / ❌ Cancel)
- Shows backup date and time
- 30-second timeout for confirmation

⚠️ **WARNING**: This will DELETE all current channels and roles before restoring!

#### `/list`
Lists all available backups for the current server.

Type `/list` to see the 10 most recent backups with their IDs and timestamps. The response is ephemeral (only you can see it).

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
   💾 File: 123456789_1234567890.json
   ```

4. The backup file is saved in the `backups/` directory

### Restoring a Backup

1. Type `/restore` in any channel

2. Start typing in the backup-id field - you'll see autocomplete suggestions with dates

3. Select a backup from the list (or paste a backup ID)

4. Click the **✅ Confirm Restore** button within 30 seconds (or **❌ Cancel** to abort)

5. Wait for the restore to complete (may take several minutes for large servers)

6. The bot will update the message when complete:
   ```
   ✅ Backup restored successfully!
   ```

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
- Each backup file is in JSON format and contains all server data
- Backup files are named: `{guildId}_{timestamp}.json`
- **Important**: Consider backing up the `backups/` directory to cloud storage for safety
- Backup files can be large (1-10 MB) for servers with many channels/roles
- You can customize the backup location using the `BACKUP_PATH` environment variable

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
