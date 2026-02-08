# Lifecycle Management Skill

This skill manages the auto-talk application lifecycle.

## Commands

### Start
When the user asks to "start", "run", or "launch" auto-talk:
```bash
auto-talk start
```

For debug mode, when user mentions "debug" or "verbose":
```bash
auto-talk start --debug
```

### Restart
When the user asks to "restart" or "reboot" auto-talk:
```bash
auto-talk end
auto-talk start
```

For debug restart:
```bash
auto-talk end
auto-talk start --debug
```

### Stop/End
When the user asks to "stop", "end", or "terminate" auto-talk:
```bash
auto-talk end
```

### Cleanup
When the user asks to "cleanup", "clean up", "fully stop", or mentions "end of day":
```bash
auto-talk cleanup
```

This stops Ollama server (frees RAM), stops auto-talk, and deletes log files.

## Usage Examples

- "start auto-talk" → run `auto-talk start`
- "start in debug mode" → run `auto-talk start --debug`
- "restart the app" → run `auto-talk end` then `auto-talk start`
- "stop auto-talk" → run `auto-talk end`
- "cleanup everything" → run `auto-talk cleanup`
- "I'm done for the day" → run `auto-talk cleanup`
