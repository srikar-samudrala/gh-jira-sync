const github = require('@actions/github');
const core = require('@actions/core');

const { jira } = require('./utils/jira');

// const githubToken = core.getInput('GITHUB_TOKEN', { required: true });
// const jiraUrl = core.getInput('JIRA_URL', { required: true });
// const jiraEmail = core.getInput('JIRA_EMAIL', { required: true });
// const jiraToken = core.getInput('JIRA_TOKEN', { required: true });

// const jiraObj = jira(jiraUrl, jiraEmail, jiraToken);
// jiraObj.fetchStatusCategories('12070', 281);
console.log(github.event_name);
