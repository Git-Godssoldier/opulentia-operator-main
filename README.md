# Opulentia Operator

> **Enhanced AI Automation Platform**
> 
> The Opulentia Operator is a next-generation AI automation platform powered by [Scrapybara](https://scrapybara.com) cloud infrastructure. This enhanced version provides both legacy browser automation capabilities and advanced multi-platform automation with Ubuntu, Browser, and Windows instances.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbrowserbase%2Fopen-operator&env=OPENAI_API_KEY,BROWSERBASE_API_KEY,BROWSERBASE_PROJECT_ID&envDescription=API%20keys%20needed%20to%20run%20Open%20Operator&envLink=https%3A%2F%2Fgithub.com%2Fbrowserbase%2Fopen-operator%23environment-variables)

## Features

### 🚀 Dual Mode Operation
- **Scrapybara Enhanced**: Full cloud automation with Ubuntu, Browser, and Windows instances
- **Legacy Mode**: Original Browserbase + Stagehand automation

### 🧠 Multi-AI Provider Support
- Anthropic Claude (default)
- OpenAI GPT-4
- Switchable in real-time via UI

### 🖥️ Multi-Platform Automation
- **Ubuntu Instances**: Full Linux environment with bash, file operations, and development tools
- **Browser Instances**: Specialized browser automation with CDP access and auth management
- **Windows Instances**: Windows-specific automation capabilities

### 🤖 Advanced Agent Capabilities
- Intelligent multi-step reasoning
- Computer vision and screenshot analysis
- Direct computer control (mouse, keyboard, screen)
- File operations and code execution
- Real-time streaming and monitoring

## Getting Started

First, install the dependencies for this repository. This requires [pnpm](https://pnpm.io/installation#using-other-package-managers).

```bash
pnpm install
```

Next, set up your environment variables:

```bash
cp .env.example .env.local
```

### Required API Keys

For **Scrapybara Enhanced Mode** (recommended):
- `SCRAPYBARA_API_KEY`: Your Scrapybara API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key (for Claude)
- `OPENAI_API_KEY`: Your OpenAI API key (optional, for GPT-4)

For **Legacy Mode**:
- `BROWSERBASE_API_KEY`: Your Browserbase API key
- `BROWSERBASE_PROJECT_ID`: Your Browserbase project ID
- `OPENAI_API_KEY`: Your OpenAI API key

Then, run the development server:

<!-- This doesn't work with NPM, haven't tested with yarn -->

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see Open Operator in action.

## How It Works

### Scrapybara Enhanced Mode

The enhanced mode leverages Scrapybara's cloud automation platform to provide:

1. **Multi-Platform Instances**: Ubuntu, Browser, and Windows environments
2. **Intelligent Agent Execution**: Advanced AI reasoning with tool usage
3. **Direct Computer Control**: Mouse, keyboard, and screen automation
4. **Real-time Streaming**: Live view of automation execution

The agent flow:
1. AI analyzes the user's goal
2. Selects appropriate instance type (Ubuntu/Browser/Windows)
3. Launches cloud instance with streaming capability
4. Executes step-by-step automation with intelligent reasoning
5. Provides real-time feedback and results

### Key Technologies

- **[Scrapybara](https://scrapybara.com)**: Cloud automation platform with multi-OS support
- **[Anthropic Claude](https://anthropic.com)**: Advanced AI reasoning and decision making
- **[OpenAI GPT-4](https://openai.com)**: Alternative AI provider option
- **[Next.js](https://nextjs.org)**: Modern web framework foundation
- **Real-time Streaming**: Live automation monitoring and control

### Legacy Mode

For compatibility, we maintain support for the original architecture:
- **Browserbase**: Browser automation infrastructure
- **Stagehand**: DOM manipulation and browser state management
- Simplified browser-only automation workflow

## Contributing

We welcome contributions! Whether it's:

- Adding new features
- Improving documentation
- Reporting bugs
- Suggesting enhancements

Please feel free to open issues and pull requests.

## License

Opulentia Operator is open source software licensed under the MIT license.

## Acknowledgments

This project is developed by **Opulentia** and powered by **Scrapybara** cloud automation platform. The enhanced version builds upon various open source technologies including Next.js, React, and advanced AI providers. Special thanks to the original Open Operator project for the foundational architecture.
