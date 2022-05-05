const fetch = require('node-fetch');

// Dev in progress - 10016
// Development Complete - 41
// Code Review - 10018
// UAT/Feature Testing - 10019
// Ready for Integration - 10020
// Code Merged - 10021
// Done - 10029
// READY FOR DEV - 10015
// on hold - 10009

function jira(
  jiraUrl = 'https://eveworldplatform.atlassian.net',
  email = 'srikar@eve.world',
  apiToken = 'seZ8op81mpXWmtgExKPm80D7'
) {
  const commonPath = '/rest/api/3';
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

  const jiraConnect = async ({
    pathname,
    method = 'GET',
    body,
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  }) => {
    const endPoint = new URL(pathname, jiraUrl);

    const requestPayload = {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
    };

    try {
      const response = await fetch(endPoint, requestPayload);
      const json = await response.json();
      console.log(json);
      return json;
    } catch (err) {
      console.log(err.message);
    }
  };

  return {
    fetchJiraTicket: (ticketId) =>
      jiraConnect({
        pathname: `${commonPath}/issue/${ticketId}`,
      }),
    fetchJiraTicketTransitions: (ticketId) =>
      jiraConnect({
        pathname: `${commonPath}/issue/${ticketId}/transitions`,
      }),
    fetchStatusCategories: () =>
      jiraConnect({ pathname: `${commonPath}/status` }),
    triggerJiraTransition: (ticketId, transitionId) => {
      const body = {
        transition: {
          id: transitionId,
        },
      };
      return jiraConnect({
        pathname: `${commonPath}/issue/${ticketId}/transitions`,
        method: 'GET',
        // body,
      });
    },
  };
}

module.exports = { jira };
