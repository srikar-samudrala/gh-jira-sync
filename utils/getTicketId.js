function getTicketId(jiraProject, str) {
  const regex = new RegExp(`${jiraProject}-\\d+`);
  const regex_match = regex.exec(str);
  const ticket_id = regex_match && regex_match.length && regex_match[0];
  return ticket_id;
}

module.exports = {
  getTicketId,
};
