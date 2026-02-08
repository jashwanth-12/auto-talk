# auto-talk

A WhatsApp message analyzer that connects to your WhatsApp account, processes message history, and uses an LLM to analyze relationships and conversation patterns.

## Installation

```bash
npm install
npm link
```

## CLI Commands

### Start

```bash
auto-talk start
```

Starts the auto-talk service:
- Deletes existing auth info (forces re-authentication)
- Displays QR code for WhatsApp Web authentication
- Connects to WhatsApp and receives message history
- Processes messages (filters last 7 days, max 500 per chat)
- Analyzes conversations using Ollama LLM

### Start with Debug Mode

```bash
auto-talk start --debug
```

Starts in debug mode with verbose logging for troubleshooting.

### End

```bash
auto-talk end
```

Stops the auto-talk service:
- Terminates the running process
- Cleans up PID file
- Deletes auth info

### Cleanup

```bash
auto-talk cleanup
```

Full cleanup for end of day:
- Stops Ollama server (frees RAM)
- Stops auto-talk if running
- Deletes log files

## Project Structure

```
src/
├── app-lifecycle/
│   ├── whatsapp-client.ts     # WhatsApp connection and event handling
│   └── shutdown-handler.ts    # Graceful shutdown and cleanup
├── code/
│   ├── message-history-processor.ts  # Message processing and transformation
│   ├── message-history-analyzer.ts   # LLM analysis and prompting
│   └── health-monitor.ts      # Server health stats logging
├── config/
│   └── config.ts              # All configuration (paths, LLM, processor settings)
├── logs/
│   └── logger.ts              # Debug logging utility
└── repository/
    └── message-history-repository.ts  # Processed data storage
```

## Configuration

Configuration is centralized in `src/config/config.ts`:

- **Processor Config**: `maxMessagesPerChat` (500), `daysToKeep` (7), `eventDebounceMs` (3000)
- **LLM Config**: Ollama host, model (`llama3.1:70b`), server check settings

## Requirements

- Node.js
- Ollama (for LLM analysis)
- WhatsApp account

## Output

- `logs/*.log` - Debug logs (only in `--debug` mode)
