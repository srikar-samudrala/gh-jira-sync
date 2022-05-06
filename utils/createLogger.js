function createLogger(contextName) {
  return function (message) {
    return `${contextName}: ${message}`;
  };
}

module.exports = {
  createLogger,
};
