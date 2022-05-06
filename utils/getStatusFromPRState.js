const CONSTANTS = require('./constants');
const { createLogger } = require('./createLogger');
const core = require('@actions/core');

function getStatusFromPRState(action, review, isPRMergedYet, matching_labels) {
  const getStatusFromPRStateLogger = createLogger('getStatusFromPRState');
  let status = '';
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
          matching_labels.includes(CONSTANTS.GH_DEV_APPROVED) ||
          matching_labels.includes(CONSTANTS.GH_QC_APPROVED) ||
          isPRMergedYet
        ) ||
        review.state === 'changes_requested'
      ) {
        status = CONSTANTS.JIRA_DEV_IN_PROGRESS;
      }
      break;
    default:
      status = '';
      break;
  }

  core.info(getStatusFromPRStateLogger(`New status => ${status}`));

  return status;
}

module.exports = {
  getStatusFromPRState,
};
