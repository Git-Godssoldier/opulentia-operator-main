# 🔧 Complete MCP Server Setup Guide

This guide will configure Model Context Protocol (MCP) servers for all your API services, enabling Claude to directly access your tools and services.

## 📋 Quick Setup

### 1. Install All MCP Servers
```bash
./install-mcp-servers.sh
```

### 2. Configure Claude Desktop

**Mac Users:**
```bash
cp claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows Users:**
```bash
copy claude_desktop_config.json %APPDATA%\Claude\claude_desktop_config.json
```

### 3. Set Environment Variables
```bash
# Load all environment variables
source mcp-environment.env
```

### 4. Restart Claude Desktop

## 🛠️ Configured MCP Servers

### Search & Research
- **Omnisearch**: Tavily, Perplexity, JINA, LinkUp integration
- **Brave Search**: Web search capabilities
- **Exa**: AI-powered search

### Web Automation
- **Firecrawl**: Web scraping and crawling
- **Browserbase**: Browser automation
- **Scrapybara**: Ubuntu desktop automation

### Code Execution
- **E2B**: Secure code execution sandboxes
- **Daytona**: Development environments

### Memory Management
- **Mem0**: AI memory management
- **Zep**: Conversational memory

### Document Processing
- **Reducto**: Document analysis and processing

### Database & Storage
- **PostgreSQL**: Direct database access
- **SQLite**: Local database operations
- **Supabase**: Real-time database

### Version Control
- **GitHub**: Repository management and operations

## 📝 API Keys Configured

✅ **Fully Configured:**
- OpenAI API
- Anthropic API
- XAI API
- Firecrawl
- Browserbase
- Scrapybara
- E2B
- Mem0
- Zep
- Reducto
- LinkUp
- ScrapeGraphAI
- GitHub
- PostgreSQL/Supabase

⏳ **Need API Keys:**
- Tavily (add to environment)
- Perplexity (add to environment)
- JINA (add to environment)
- HyperBrowser (add to environment)
- ElevenLabs (add to environment)

## 🔍 Verification

After setup, verify MCP servers are loaded:

1. Open Claude Desktop
2. Go to Settings → Developer
3. Check "MCP Servers" section
4. Verify all servers show "Connected" status

## 🚀 Usage Examples

### Search with Multiple Sources
```
Use Tavily to search for "latest AI research papers" and then use JINA to extract key insights from the top 3 results.
```

### Web Automation
```
Use Browserbase to navigate to example.com, take a screenshot, and then use Firecrawl to extract all the text content.
```

### Code Execution
```
Use E2B to create a Python environment and run a data analysis script on this CSV data.
```

### Memory Management
```
Use Mem0 to remember this conversation context and Zep to store user preferences for future sessions.
```

### Database Operations
```
Use the PostgreSQL server to query our Supabase database for user analytics data.
```

## 🔧 Troubleshooting

### Server Not Loading
1. Check API keys are correctly set
2. Verify NPM packages are installed globally
3. Restart Claude Desktop
4. Check console logs in Claude Desktop Developer Tools

### Permission Errors
```bash
# Fix NPM permission issues
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Missing Packages
```bash
# Reinstall specific server
npm install -g @modelcontextprotocol/server-github
```

## 📚 Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Community MCP Servers](https://github.com/punkpeye/awesome-mcp-servers)

## 🔄 Updates

To update all MCP servers:
```bash
npm update -g @modelcontextprotocol/server-*
npm update -g mcp-*
```

## 🆘 Support

If you encounter issues:
1. Check the MCP server logs in Claude Desktop
2. Verify API keys are valid and have proper permissions
3. Ensure all environment variables are set correctly
4. Restart Claude Desktop after configuration changes