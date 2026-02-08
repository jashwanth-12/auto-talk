# Git Push Skill

This skill handles pushing code changes to the remote repository.

## Command

When the user asks to "push", "push to remote", "commit and push", or "save changes":

```bash
git add . && git commit -m "<message from user>" && git push -f origin
```

## Usage Examples

- "push with message 'Added lifecycle management'" → run `git add . && git commit -m "Added lifecycle management" && git push -f origin`
- "push changes: fixed bug in analyzer" → run `git add . && git commit -m "fixed bug in analyzer" && git push -f origin`
- "commit and push: refactored LLM code" → run `git add . && git commit -m "refactored LLM code" && git push -f origin`
- "save my changes with message 'initial setup'" → run `git add . && git commit -m "initial setup" && git push -f origin`

## Notes

- Always get the commit message from the user
- Uses force push (`-f`) to origin
- Stages all changes with `git add .`
