Propogating a commit...

ATOM side: 

Create bundle

  git bundle create ~/Documents/Repos/ld-mimir/tools/commits.bundle master ^[SHARED HEAD REF]

Transfer the bundle to Mimir

MIMIR SIDE:

Reset 

  git reset --hard [SHARED HEAD REF]

Verify the Bundle

  git bundle verify /path/to/bundle

Fetch the bundle if it's okay

  git fetch /path/to/bundle master:incoming

Rebase 
  
  git rebase incoming

Clean up

  git branch -d incoming

Update [SHARED HEAD REF]