const github = require('@actions/github');
const core = require('@actions/core');

const { jira } = require('./utils/jira');

const GH_READY_FOR_REVIEW = 'Ready for Review';
const GH_WORK_IN_PROGRESS = 'Work in Progress';
const GH_DEV_APPROVED = 'Dev Approved';
const GH_QC_APPROVED = 'QC Approved';
const GH_LABELS = [
  GH_READY_FOR_REVIEW,
  GH_WORK_IN_PROGRESS,
  GH_DEV_APPROVED,
  GH_QC_APPROVED,
];

const JIRA_DEV_IN_PROGRESS = 'DEV IN PROGRESS';
const JIRA_READY_FOR_DEV = 'READY FOR DEV';
const JIRA_READY_FOR_INTEGRATION = 'READY FOR INTEGRATION';
const JIRA_DEV_COMPLETE = 'DEV COMPLETE';
const JIRA_CODE_REVIEW = 'CODE REVIEW';
const JIRA_UAT_FEATURE_TESTING = 'UAT/FEATURE TESTING';
const JIRA_NEW = 'NEW';
const JIRA_TODO = 'TO DO';

const githubToken = core.getInput('GITHUB_TOKEN', { required: true });
const jiraUrl = core.getInput('JIRA_URL', { required: true });
const jiraEmail = core.getInput('JIRA_EMAIL', { required: true });
const jiraToken = core.getInput('JIRA_TOKEN', { required: true });
const jiraProject = core.getInput('JIRA_PROJECT', { required: true });
const regex = new RegExp(`${jiraProject}-\\d+`);

const jiraObj = jira(jiraUrl, jiraEmail, jiraToken);
console.log(Object.keys(github.context.payload));
console.log('========================');
console.log(JSON.stringify(github.context.payload, null, 2));

const JIRA_WORKFLOW = {
  [`${JIRA_DEV_IN_PROGRESS}-${JIRA_CODE_REVIEW}`]: [
    JIRA_DEV_COMPLETE,
    JIRA_CODE_REVIEW,
  ],
};

async function run() {
  try {
    const action = github.context.payload.action;
    const pull_request = github.context.payload.pull_request;
    const review =
      (github.context.payload && github.context.payload.review) || {};
    const pr_title = pull_request.title;
    const labels = pull_request.labels.map((label) => label.name);
    const matching_labels = GH_LABELS.filter((label) => labels.includes(label));

    // Fail the action if the PR title doesn't exist
    if (!pr_title) {
      core.info('No PR title found');
      return;
    }

    const regex_match = regex.exec(pr_title);
    const ticket_id = regex_match && regex_match.length && regex_match[0];

    // Fail the action if the PR title doesn't match the regex
    if (!ticket_id) {
      core.info('No ticket id found in PR title');
      return;
    }

    core.info(`Ticket id: ${ticket_id}`);
    core.info(`${pull_request.merged} merged?`);
    let new_jira_status = '';
    let current_jira_status = '';

    switch (action) {
      case 'opened':
      case 'reopened':
      case 'submitted':
      case 'closed':
        // check if PR has no approved labels or,
        // if the reviewer requests changes or,
        // if the PR is closed and not merged,
        // then set the new status to In Progress
        if (
          !(
            matching_labels.includes(GH_DEV_APPROVED) ||
            matching_labels.includes(GH_QC_APPROVED) ||
            pull_request.merged_at
          ) ||
          review.state === 'changes_requested'
        ) {
          new_jira_status = JIRA_DEV_IN_PROGRESS;
        }
        break;
      default:
        new_jira_status = '';
        break;
    }

    if (new_jira_status === '') {
      // check labels and set the new_jira_status accordingly
      if (matching_labels.includes(GH_READY_FOR_REVIEW)) {
        new_jira_status = JIRA_CODE_REVIEW;
      } else if (matching_labels.includes(GH_WORK_IN_PROGRESS)) {
        new_jira_status = JIRA_DEV_IN_PROGRESS;
      } else if (matching_labels.includes(GH_DEV_APPROVED)) {
        new_jira_status = JIRA_UAT_FEATURE_TESTING;
      } else if (matching_labels.includes(GH_QC_APPROVED)) {
        new_jira_status = JIRA_READY_FOR_INTEGRATION;
      }
    }

    if (new_jira_status === '') {
      core.info('No status change');
      return;
    }

    core.info(`New status change: ${new_jira_status}`);

    const ticket_obj = await jiraObj.fetchJiraTicket(ticket_id);

    if (!ticket_obj) {
      core.info('No ticket found');
      return;
    }

    current_jira_status = ticket_obj.fields.status.name;
    core.info(`Current status: ${current_jira_status}`);

    if (current_jira_status.toLowerCase() === new_jira_status.toLowerCase()) {
      core.info('Status already set');
      return;
    }

    const transitionsResponse = await jiraObj.fetchJiraTicketTransitions(
      ticket_id
    );

    if (!transitionsResponse || transitionsResponse.transitions.length === 0) {
      core.info('No transitions found. Unable to set status');
      return;
    }
    console.log(
      'workflow key',
      `${current_jira_status.toUpperCase()}-${new_jira_status}`
    );
    const transition_obj = transitionsResponse.transitions.find(
      (transition) =>
        transition.to.name.toLowerCase() === new_jira_status.toLowerCase()
    );
    if (transition_obj && transition_obj.id) {
      await jiraObj.triggerJiraTransition(ticket_id, transition_obj.id);
      core.info(
        `Jira transition triggered: ${current_jira_status} to ${new_jira_status}`
      );
    } else if (
      JIRA_WORKFLOW[`${current_jira_status.toUpperCase()}-${new_jira_status}`]
    ) {
      const arr =
        JIRA_WORKFLOW[
          `${current_jira_status.toUpperCase()}-${new_jira_status}`
        ];
      if (arr.length) {
        await callTransitions(arr, ticket_id, transitionsResponse);
      } else {
        core.info('workflow not yet defined on the client side');
        return;
      }
    } else {
      core.info('No matching transition id found. Unable to set status');
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return;
  }
}

run();

async function callTransitions(arr, ticket_id) {
  for (const transition of arr) {
    const transitionsResponse = await jiraObj.fetchJiraTicketTransitions(
      ticket_id
    );
    const transition_obj = transitionsResponse.transitions.find(
      (trans) => trans.to.name.toLowerCase() === transition.toLowerCase()
    );
    if (!transition_obj) {
      console.log('no matching transition found in the loop');
      return;
    }
    await jiraObj.triggerJiraTransition(ticket_id, transition_obj.id);
  }
  console.log('Done with transition loop');
}
