const workflow = require('../workflow.json');

function getStatusName(id) {
  const statuses = workflow.layout.statuses;

  return statuses.filter((status) => status.id === id)[0].name;
}

module.exports = {
  getStatusName,
};
