const core = require('@actions/core');
const { createLogger } = require('./createLogger');
const CONSTANTS = require('./constants');

function getStatusFromPRLabels(matching_labels) {
  const getStatusFromPRLabelsLogger = createLogger('getStatusFromPRLabels');
  let status = '';

  if (matching_labels.includes(CONSTANTS.GH_READY_FOR_REVIEW)) {
    status = CONSTANTS.JIRA_CODE_REVIEW;
  } else if (matching_labels.includes(CONSTANTS.GH_WORK_IN_PROGRESS)) {
    status = CONSTANTS.JIRA_DEV_IN_PROGRESS;
  } else if (matching_labels.includes(GH_DEV_APPROVED)) {
    status = CONSTANTS.JIRA_UAT_FEATURE_TESTING;
  } else if (matching_labels.includes(GH_QC_APPROVED)) {
    status = CONSTANTS.JIRA_READY_FOR_INTEGRATION;
  }

  core.info(getStatusFromPRLabelsLogger(`New status => ${status}`));

  return status;
}

module.exports = {
  getStatusFromPRLabels,
};
