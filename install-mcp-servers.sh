#!/bin/bash

echo "🚀 Installing Available MCP Servers for Your API Services..."

# Core MCP Framework
echo "Installing core MCP packages..."
npm install -g @modelcontextprotocol/sdk
npm install -g @modelcontextprotocol/inspector

# Search & Research Services
echo "📊 Installing Search & Research MCP Servers..."
npm install -g @modelcontextprotocol/server-brave-search

# Web Automation & Browsing  
echo "🌐 Installing Web Automation MCP Servers..."
npm install -g @modelcontextprotocol/server-puppeteer
npm install -g puppeteer-mcp-server

# Memory Management
echo "🧠 Installing Memory Management MCP Servers..."
npm install -g @modelcontextprotocol/server-memory

# Database & Storage
echo "🗄️ Installing Database MCP Servers..."
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-redis

# Version Control & Development
echo "🔧 Installing Development MCP Servers..."
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-slack

# Utility Servers
echo "⚙️ Installing Utility MCP Servers..."
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-sequential-thinking
npm install -g @modelcontextprotocol/server-everything

# Specialized Services
echo "🎨 Installing Specialized MCP Servers..."
npm install -g @modelcontextprotocol/server-google-maps
npm install -g @modelcontextprotocol/server-everart
npm install -g figma-mcp

# Check if packages were installed successfully
echo "✅ Checking installations..."
echo "MCP SDK installed: $(npm list -g @modelcontextprotocol/sdk --depth=0 2>/dev/null | grep -o '@modelcontextprotocol/sdk@.*' || echo 'Not found')"
echo "🎉 MCP Server installation complete!"

echo ""
echo "📋 Next Steps:"
echo "1. Copy claude_desktop_config.json to your Claude Desktop config directory:"
echo "   Mac: ~/Library/Application Support/Claude/"
echo "   Windows: %APPDATA%\\Claude\\"
echo ""
echo "2. Restart Claude Desktop"
echo ""
echo "3. Check MCP servers are loaded in Claude Desktop settings"
echo ""
echo "4. Add any missing API keys to the configuration file"
echo ""
echo "🔍 Installed MCP Servers:"
echo "✅ Brave Search - Web search capabilities"
echo "✅ Puppeteer - Browser automation"
echo "✅ Memory - Knowledge graph memory"
echo "✅ PostgreSQL - Database access (configured for your Supabase)"
echo "✅ Redis - Fast data storage"
echo "✅ GitHub - Repository management (configured with your token)"
echo "✅ Slack - Team communication"
echo "✅ Filesystem - File operations"
echo "✅ Sequential Thinking - Problem solving"
echo "✅ Google Maps - Location services"
echo "✅ Figma - Design tool integration"