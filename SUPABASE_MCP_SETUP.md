# Supabase MCP Server Setup Guide

This guide explains how to set up the Supabase Model Context Protocol (MCP) server to enable AI assistants like Cursor to interact directly with your Supabase database.

## What is MCP?

The Model Context Protocol (MCP) is a standard protocol that allows AI assistants to interact with external systems. The Supabase MCP server provides:

- Direct database queries through AI
- Schema inspection
- CRUD operations on tables
- SQL query execution
- Real-time database insights

## Prerequisites

1. A Supabase account and project ([sign up here](https://supabase.com))
2. Node.js 18+ installed
3. Cursor IDE or another MCP-compatible AI assistant

## Installation Steps

### 1. Install Supabase MCP Server

Install the official Supabase MCP server globally:

```bash
npm install -g @supabase/mcp-server-postgrest
```

### 2. Configure Supabase Project

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (the `anon` `public` key)

### 3. Set Up Environment Variables

Copy the `.env.local` file and add your Supabase credentials:

```bash
# In your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_DB_PASSWORD=your_database_password_here
```

### 4. Run Database Migrations

Initialize your database schema:

```bash
# Get your project reference from the URL (e.g., abcdefghijklmnop from https://abcdefghijklmnop.supabase.co)
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-database-password"

# Run the initial schema migration
./run-migration.sh $PROJECT_REF $DB_PASSWORD

# Or manually with psql
psql "postgresql://postgres.$PROJECT_REF:$DB_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres" \
  -f migrations/01_initial_schema.sql

# Run the audio URL migration
psql "postgresql://postgres.$PROJECT_REF:$DB_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres" \
  -f migrations/add_audio_url_to_stories.sql
```

### 5. Configure Cursor MCP Settings

#### Option A: Using Cursor Settings UI (Recommended)

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" in settings
3. Click "Edit MCP Settings"
4. Add the Supabase MCP server configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "mcp-server-postgrest",
      "args": [],
      "env": {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
        "SUPABASE_ANON_KEY": "your_supabase_anon_key_here"
      }
    }
  }
}
```

#### Option B: Manual Configuration File

Create or edit `~/.cursor/mcp.json` (on Mac/Linux) or `%APPDATA%\Cursor\mcp.json` (on Windows):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "mcp-server-postgrest",
      "args": [],
      "env": {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
        "SUPABASE_ANON_KEY": "your_supabase_anon_key_here"
      }
    }
  }
}
```

### 6. Restart Cursor

After configuring the MCP server:
1. Completely quit Cursor
2. Reopen Cursor
3. The MCP server should now be active

## Verifying the Setup

### Test Database Connection

In Cursor, you can now ask questions like:

- "Show me all podcast episodes in the database"
- "What tables exist in my Supabase database?"
- "Insert a test episode into podcast_episodes"
- "Query the latest 5 stories"

The AI will use the MCP server to interact with your Supabase database directly.

### Check MCP Server Status

In Cursor:
1. Open the Command Palette (Cmd/Ctrl + Shift + P)
2. Search for "MCP"
3. Look for "Show MCP Servers" or similar option
4. Verify that the Supabase server is listed and active

## Database Schema

### podcast_episodes Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Episode title |
| script | TEXT | Full episode script |
| status | TEXT | 'pending', 'complete', etc. |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### stories Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| episode_id | UUID | Foreign key to podcast_episodes |
| headline | TEXT | Story headline |
| script | TEXT | Story script |
| audio_url | TEXT | URL to audio file |
| order | INTEGER | Story order in episode |
| sources | JSONB | Source URLs and data |
| quotes | JSONB | Extracted quotes |
| created_at | TIMESTAMP | Creation timestamp |

## Available MCP Operations

Once configured, the Supabase MCP server provides:

### Query Operations
- `SELECT` queries on any table
- Filtering with `WHERE` clauses
- Ordering and pagination
- Join operations

### Modification Operations
- `INSERT` new records
- `UPDATE` existing records
- `DELETE` records
- Bulk operations

### Schema Operations
- List all tables
- Describe table schemas
- View relationships and foreign keys
- Check indexes

### Advanced Operations
- Execute raw SQL queries
- Transaction support
- RPC function calls

## Security Considerations

⚠️ **Important Security Notes:**

1. **Use Anon Key in MCP Config**: Always use the anon/public key, not the service role key
2. **Row Level Security**: Enable RLS policies in Supabase for production
3. **Environment Variables**: Never commit actual credentials to git
4. **Network Security**: Ensure your Supabase project has appropriate access controls

## Troubleshooting

### MCP Server Not Starting

**Problem**: The MCP server doesn't appear in Cursor

**Solutions**:
1. Verify the global installation: `which mcp-server-postgrest`
2. Check the command is accessible: `mcp-server-postgrest --help`
3. Restart Cursor completely
4. Check the MCP configuration JSON syntax

### Connection Errors

**Problem**: "Failed to connect to Supabase"

**Solutions**:
1. Verify your `SUPABASE_URL` is correct (include `https://`)
2. Check the `SUPABASE_ANON_KEY` is the anon/public key, not the service role key
3. Ensure your Supabase project is active and not paused
4. Test the connection manually using the Supabase JavaScript client

### Permission Errors

**Problem**: "Insufficient privileges" or permission denied errors

**Solutions**:
1. Check your Row Level Security (RLS) policies in Supabase
2. Temporarily disable RLS for testing (not recommended for production)
3. Verify the anon key has the necessary permissions
4. Check table permissions in the Supabase dashboard

### Query Errors

**Problem**: Queries fail or return unexpected results

**Solutions**:
1. Test the query directly in Supabase SQL Editor
2. Check table and column names (case-sensitive)
3. Verify foreign key relationships
4. Ensure required columns are included in INSERT operations

## Example Usage

### Creating an Episode with Stories

Ask Cursor:
```
Create a new podcast episode titled "AI News for January 18, 2026" 
and add 3 stories to it with the following headlines:
1. "OpenAI Releases GPT-5"
2. "Google's Gemini 2.0 Now Available"
3. "Meta Announces New AI Research Lab"
```

The AI will use the MCP server to:
1. Insert a new record in `podcast_episodes`
2. Insert 3 records in `stories` with the appropriate `episode_id`
3. Set the correct `order` values

### Querying Latest Episode

Ask Cursor:
```
Show me the latest complete podcast episode with all its stories
```

The AI will construct and execute the appropriate SQL query.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Cursor MCP Documentation](https://docs.cursor.com/advanced/mcp)
- [PostgREST Documentation](https://postgrest.org)

## Support

For issues specific to:
- **Supabase MCP Server**: [GitHub Issues](https://github.com/supabase-community/supabase-mcp)
- **This Project**: Open an issue in this repository
- **Supabase Platform**: [Supabase Support](https://supabase.com/support)
- **Cursor IDE**: [Cursor Support](https://cursor.sh/support)
