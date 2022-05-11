# Github Jira Sync Action

This action transitions the Jira status based on the Github labels

## Inputs

### `GITHUB_ACTION`

**Required**

### `TRIAL_RUN`

flag for trial run. No merge will happen, just logs the result.

### `COMMIT_MESSAGE`

Message to be used while merging!

## Example usage

```
uses: srikarsams/rebase@v1.0
  with:adfas
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  COMMIT_MESSAGE: "Rebase done successfully!"
```
