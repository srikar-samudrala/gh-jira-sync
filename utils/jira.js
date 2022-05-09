const fetch = require('node-fetch');
const core = require('@actions/core');
const { createLogger } = require('./createLogger');

// Dev in progress - 10016
// Development Complete - 41
// Code Review - 10018
// UAT/Feature Testing - 10019
// Ready for Integration - 10020
// Code Merged - 10021
// Done - 10029
// READY FOR DEV - 10015
// on hold - 10009

function jira(jiraUrl, email, apiToken) {
  const jiraLogger = createLogger('Jira');
  const commonPath = '/rest/api/3';
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  let workflow = {};

  const jiraConnect = async ({
    url,
    pathname,
    method = 'GET',
    body,
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  }) => {
    const endPoint = url ? url : new URL(pathname, jiraUrl);
    const requestPayload = {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers,
    };

    try {
      const response = await fetch(endPoint, requestPayload);
      const json = await response.json();
      return json;
    } catch (err) {
      core.info(jiraLogger(err.message));
      return null;
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
        method: 'POST',
        body,
      });
    },
    fetchWorkflow: async (name) => {
      if (Object.keys(workflow).length > 0) {
        return workflow;
      } else {
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
          'X-Atlassian-Token': 'no-check',
        };
        workflow = await jiraConnect({
          url: new URL(
            `rest/workflowDesigner/latest/workflows?name=${name}&draft=false`,
            jiraUrl
          ),
          headers,
        });
        return workflow;
      }
    },
  };
}

module.exports = { jira };
