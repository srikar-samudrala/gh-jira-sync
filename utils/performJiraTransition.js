const core = require('@actions/core');

const { generateTransitionFlow } = require('./generateTransitionFlow');
const { createLogger } = require('./createLogger');

function getJiraTransitionObj(transitionsResponse, transition) {
  return transitionsResponse.transitions.find(
    (trans) => trans.to.name.toLowerCase() === transition.toLowerCase()
  );
}

async function callTransitions(jiraObj, arr, ticket_id) {
  const callTransitionsLogger = createLogger('callTransitions');
  for (const transition of arr) {
    const transitionsResponse = await jiraObj.fetchJiraTicketTransitions(
      ticket_id
    );

    const transition_obj = getJiraTransitionObj(
      transitionsResponse,
      transition
    );

    if (!transition_obj) {
      core.info(
        callTransitionsLogger('no matching transition found in the loop')
      );
      return;
    }

    await jiraObj.triggerJiraTransition(ticket_id, transition_obj.id);
  }
  core.info(callTransitionsLogger('Done with transition loop'));
}

async function performJiraTransition(
  jiraObj,
  new_jira_status,
  current_jira_status,
  transitionsResponse,
  ticket_id,
  jiraWorkflowName
) {
  const performJiraTransitionLogger = createLogger('performJiraTransition');

  // Finds the transition object of the new jira status
  const transition_obj = getJiraTransitionObj(
    transitionsResponse,
    new_jira_status
  );

  // if transition obj is available, then perform the transition
  // by doing a call to JIRA server
  if (transition_obj && transition_obj.id) {
    await jiraObj.triggerJiraTransition(ticket_id, transition_obj.id);

    core.info(
      performJiraTransitionLogger(
        `Jira transition triggered: ${current_jira_status} to ${new_jira_status}`
      )
    );
    // if transition obj is not available for the new status, it means that
    // it is not possible to do new status transition directly as it may include
    // multiple transitions to be done in between.
    // this block checks the same by checking whether we have the workflow defined
    // for doing this multi-step transition. if not then ignore the transition
  } else {
    // fetches jira workflow based on the ticket type
    const jiraWorkflow = await jiraObj.fetchWorkflow(jiraWorkflowName);
    if (!Object.keys(jiraWorkflow).length) {
      core.info(
        performJiraTransitionLogger(
          'Unable to fetch Jira workflow hence cancelling jira state transition'
        )
      );
      return;
    }
    const arr = generateTransitionFlow(
      getTransitionPair(current_jira_status, new_jira_status, jiraWorkflow),
      jiraWorkflow
    );

    if (arr.length) {
      await callTransitions(jiraObj, arr, ticket_id);
    } else {
      core.info(
        performJiraTransitionLogger(
          'No matching transition id found or workflow found. Unable to set status'
        )
      );
    }
  }
}

function getTransitionPair(current, target, jiraWorkflow) {
  const getTransitionPairLogger = createLogger('getTransitionPair');
  const statuses = jiraWorkflow.layout.statuses;
  const pair = [];

  statuses.forEach((status) => {
    if (status.name.toLowerCase() === current.toLowerCase()) {
      pair[0] = status.id;
    } else if (status.name.toLowerCase() === target.toLowerCase()) {
      pair[1] = status.id;
    }
  });

  core.info(getTransitionPairLogger(`TransitionPair => ${pair}`));

  return pair;
}

module.exports = {
  performJiraTransition,
};
