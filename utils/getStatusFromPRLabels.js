const core = require('@actions/core');
const { createLogger } = require('./createLogger');
const CONSTANTS = require('./constants');

async function getStatusFromPRLabels(
  fetchReviews,
  matching_labels,
  ticketType
) {
  const getStatusFromPRLabelsLogger = createLogger('getStatusFromPRLabels');
  let status = '';

  if (matching_labels.includes(CONSTANTS.GH_READY_FOR_REVIEW)) {
    status = CONSTANTS.JIRA_CODE_REVIEW;
  } else if (matching_labels.includes(CONSTANTS.GH_WORK_IN_PROGRESS)) {
    status = CONSTANTS.JIRA_DEV_IN_PROGRESS;
  } else if (matching_labels.includes(CONSTANTS.GH_DEV_APPROVED)) {
    const reviews = await fetchReviews();
    if (!reviews.data.length) {
      core.info(
        getStatusFromPRLabelsLogger(
          "Dev Approved label applied but PR doesn't have necessary approvals"
        )
      );
      return;
    }
    const isApproved =
      reviews.data.filter((review) => {
        review.state === 'APPROVED';
      }).length >= 2;

    if (!isApproved) {
      core.info(
        getStatusFromPRLabelsLogger(
          "Dev Approved label applied but PR doesn't have necessary approvals"
        )
      );
      return;
    }
    status =
      ticketType === CONSTANTS.JIRA_TICKET_TYPE.BUG
        ? CONSTANTS.JIRA_UAT
        : CONSTANTS.JIRA_UAT_FEATURE_TESTING;
  } else if (matching_labels.includes(CONSTANTS.GH_QC_APPROVED)) {
    status = CONSTANTS.JIRA_READY_FOR_INTEGRATION;
  }

  core.info(getStatusFromPRLabelsLogger(`New status => ${status}`));

  return status;
}

module.exports = {
  getStatusFromPRLabels,
};
