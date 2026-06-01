# Optional Git History Cleanup

The implementation removes `server1.20.4` from the Git index going forward, but
existing clones may still have a large pack file because the old server payload
exists in previous commits.

Only do a history rewrite after everyone has backed up local work and agreed to
re-clone or reset their branches.

Recommended sequence:

```powershell
# Install git-filter-repo first:
# https://github.com/newren/git-filter-repo

git filter-repo --path server1.20.4 --invert-paths
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Then force-push the rewritten branches and tags from a maintainer machine.

If you do not rewrite history, the app still works correctly; the repository
just remains larger for anyone cloning old history.
