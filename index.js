const github = require('@actions/github');
const core = require('@actions/core');

const { jira } = require('./utils/jira');
const { createLogger } = require('./utils/createLogger');
const { getTicketId } = require('./utils/getTicketId');
const { getStatusFromPRState } = require('./utils/getStatusFromPRState');
const { getStatusFromPRLabels } = require('./utils/getStatusFromPRLabels');
const { performJiraTransition } = require('./utils/performJiraTransition');
const CONSTANTS = require('./utils/constants');

// Fetch inputs provided by the GH action user
const jiraUrl = core.getInput('JIRA_URL', { required: true });
const jiraEmail = core.getInput('JIRA_EMAIL', { required: true });
const jiraToken = core.getInput('JIRA_TOKEN', { required: true });
const jiraProject = core.getInput('JIRA_PROJECT', { required: true });
const githubToken = core.getInput('GITHUB_TOKEN', { required: true });

// creates an instance Jira obj for interacting with Jira server
const jiraObj = jira(jiraUrl, jiraEmail, jiraToken);
const octokit = new github.getOctokit(githubToken);

async function run() {
  const runLogger = createLogger('run');
  try {
    // creates all the required variables from github context payload
    const action = github.context.payload.action;
    console.log(
      await octokit.pull_request_reviews('srikar-samudrala/gh-jira-sync', 33)
    );
    const pull_request = github.context.payload.pull_request;
    const review =
      (github.context.payload && github.context.payload.review) || {};
    const pr_title = pull_request.title;
    const labels = pull_request.labels.map((label) => label.name);
    const matching_labels = CONSTANTS.GH_LABELS.filter((label) =>
      labels.includes(label)
    );
    const isPRMergedYet = pull_request.merged;
    core.info(JSON.stringify(github.context, null, 2));
    // Fail the action if the PR title doesn't exist
    if (!pr_title) {
      core.info(runLogger('PR title is empty'));
      return;
    }

    // Fetches the ticket id by performing the regex check
    const ticket_id = getTicketId(jiraProject, pr_title);

    // Fail the action if the PR title doesn't match the regex
    if (!ticket_id) {
      core.info(runLogger('No ticket id found in PR title'));
      return;
    }

    core.info(runLogger(`Ticket id => ${ticket_id}`));
    core.info(runLogger(`Is the PR merged yet? => ${isPRMergedYet}`));

    // Fetches the Jira ticket object using ticket ID
    const ticket_obj = await jiraObj.fetchJiraTicket(ticket_id);

    if (!ticket_obj) {
      core.info(runLogger('No ticket found'));
      return;
    }

    const ticketType = ticket_obj.fields.issuetype.name;
    core.info(runLogger(ticketType));

    // Stop going further if ticket is not of type task or bug
    if (!Object.values(CONSTANTS.JIRA_TICKET_TYPE).includes(ticketType)) {
      core.info(
        runLogger(
          'Currently supports only tickets of type "Story", "Task" and "Bug"'
        )
      );
      return;
    }

    // this provides us a new status if and only if this action
    // is triggered by PR state change (like open, close, changes requested etc..,)
    let new_jira_status = getStatusFromPRState(
      action,
      review,
      isPRMergedYet,
      matching_labels
    );

    // if the action is not triggered due to the change in PR status
    // as mentioned above, then assign the new status based on the labels
    if (new_jira_status === '') {
      new_jira_status = getStatusFromPRLabels(matching_labels, ticketType);
    }

    if (new_jira_status === '') {
      core.info(runLogger('No status change required'));
      return;
    }

    const jiraWorkflowName = CONSTANTS.WORKFLOW_NAME[ticketType];

    let current_jira_status = ticket_obj.fields.status.name;
    core.info(runLogger(`Current status => ${current_jira_status}`));

    // if the new status matches with ticket status received from JIRA,
    // then nothing else to be done.
    if (current_jira_status.toLowerCase() === new_jira_status.toLowerCase()) {
      core.info(runLogger('Status already set'));
      return;
    }

    // Fetches the possible jira transitions for this ticket at current state
    const transitionsResponse = await jiraObj.fetchJiraTicketTransitions(
      ticket_id
    );

    if (!transitionsResponse || transitionsResponse.transitions.length === 0) {
      core.info(runLogger('No transitions found. Unable to set status'));
      return;
    }

    core.info(
      runLogger(
        `JIRA Workflow Key => ${current_jira_status.toUpperCase()}-${new_jira_status}`
      )
    );

    await performJiraTransition(
      jiraObj,
      new_jira_status,
      current_jira_status,
      transitionsResponse,
      ticket_id,
      jiraWorkflowName
    );
  } catch (err) {
    core.info(runLogger(`Error: ${err.message}`));
    return;
  }
}

run();
