function getStatusName(id, jiraWorkflow) {
  const statuses = jiraWorkflow.layout.statuses;

  return statuses.filter((status) => status.id === id)[0].name;
}

module.exports = {
  getStatusName,
};
