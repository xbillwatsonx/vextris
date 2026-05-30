# Git Guide for Vextris (and your future projects)

This is a short reference for Bill and any agent working in your repos.
Written for someone who is new to coding.
If you only learn three commands, learn the first three.

---

## The Three Commands You Actually Use

Every time you finish a meaningful chunk of work:

```
git add -A                      # stage everything you changed or created
git commit -m "what you did"    # save it as a checkpoint
git push                        # send it to GitHub (your backup)
```

That's the cycle.  Edit → Add → Commit → Push.  Repeat.

---

## What Each Command Does

| Command | What it does | Real-world analogy |
|---------|-------------|-------------------|
| `git status` | Shows what's changed since your last checkpoint | Taking inventory |
| `git add <file>` | Marks files to include in the next checkpoint | Putting things in the shopping cart |
| `git commit -m "..."` | Creates a permanent checkpoint with a message | Taking a photo — that moment is now saved forever |
| `git push` | Uploads your checkpoints to GitHub | Offsite backup. If your computer dies, your work is safe |
| `git pull` | Downloads any changes from GitHub | Syncing. Important if multiple people work on the same project |
| `git log --oneline` | Shows your checkpoint history | Looking at your photo album |

---

## When to Commit

Commit after finishing something that makes sense as a unit:

- ✅ "split the big file into smaller modules" → commit
- ✅ "fixed the vex pipeline bug" → commit
- ❌ "did some work" → too vague
- ❌ Don't wait days. If you can describe what you did in 5-10 words, it's ready.

---

## Writing Good Commit Messages

Keep it short. The first line should say what changed.

**Good:**
```
feat: add .gitignore and clean up build
fix: missing type imports caused tsc build failure
docs: add git guide for new developers
```

**Not good:**
```
stuff
fixes
updated files
```

The colon convention (`type: message`) helps you and agents scan history quickly:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — reorganizing code without changing behavior
- `test:` — adding or fixing tests

---

## Things You Never Commit

These go in `.gitignore` and should never be tracked:

- `node_modules/` — thousands of dependency files. Anyone can rebuild them with `npm install`.
- `dist/` — the build output. Anyone can rebuild with `npm run build`.
- `.env` files — often contain secret keys. Never commit secrets to git.
- Editor junk — `.vscode/`, `.idea/`, `*.swp`

Your `.gitignore` already covers these.

---

## Quick Troubleshooting

| Situation | What to do |
|-----------|-----------|
| "I committed something I shouldn't have" | `git reset HEAD~1` — undo last commit (keeps files). Only if you haven't pushed yet. |
| "I want to see what changed" | `git diff` — shows unstaged changes. `git diff --staged` — shows staged changes. |
| "Git is asking me to configure my name/email" | `git config --global user.name "Bill"` and `git config --global user.email "you@email.com"` |
| "I have no idea what's going on" | `git status` — start here. Always. |

---

## The Golden Rule

**If you're about to close your laptop for the day, commit and push.**

Untracked work is work that can vanish. Committed and pushed work is safe.
