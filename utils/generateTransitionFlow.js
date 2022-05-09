const core = require('@actions/core');

const { createLogger } = require('./createLogger');
const { getStatusName } = require('./getStatusName');

const transitions = [];
const generateTransitionFlowLogger = createLogger('generateTransitionFlow');

function generateTransitionFlow(transitionPair, jiraWorkflow) {
  try {
    if (transitionPair && transitionPair.length < 2) {
      core.info(
        generateTransitionFlowLogger(
          `Transition pair is invalid -> ${transitionPair}`
        )
      );
      return [];
    }
    generateTransitions(jiraWorkflow);
    const targetSourceDestinationPair = transitionPair;

    let sourcePairs = [];
    let destinationPairs = [];
    let count = 0;
    let loopCount = 0;

    sourcePairs.push(
      findPairsWithThisSourceOrDestination(targetSourceDestinationPair[0], 0)
    );

    destinationPairs.push(
      findPairsWithThisSourceOrDestination(targetSourceDestinationPair[1], 1)
    );

    if (!sourcePairs.length || !destinationPairs.length) {
      return [];
    }

    const intersections = doesSourceAndDestinationMatch(
      sourcePairs[0],
      destinationPairs[0]
    );

    if (intersections.length) {
      const flow = [
        getStatusName(intersections[0], jiraWorkflow),
        getStatusName(targetSourceDestinationPair[1], jiraWorkflow),
      ];
      return flow;
    } else {
      let intersections = [];
      while (!intersections.length && loopCount < 50) {
        const recursiveOutput = verifyRecursively(
          sourcePairs[count],
          destinationPairs[0]
        );
        intersections = [...recursiveOutput[1]];
        sourcePairs.push(recursiveOutput[0]);
        count++;
        loopCount++;
      }

      // after finding the intersection, check which destination in sourcePair matches
      // with the source of Destination pairs
      const matched = sourcePairs[count].filter((d) => {
        return d[1] === intersections[0];
      });

      if (!matched.length) {
        throw Error('something is wrong');
      }

      // initialize the transition flow
      const path = [targetSourceDestinationPair[1], matched[0][1]];
      const reveredSourcePairs = [...sourcePairs].reverse();
      reveredSourcePairs.forEach((reversedSourcePairList, i) => {
        reversedSourcePairList.every((reversedSourcePair) => {
          if (reversedSourcePair[1] === path[path.length - 1]) {
            path.push(reversedSourcePair[0]);
            return false;
          }
          return true;
        });
      });

      const finalTransitionFlow = path.reverse().map(
        (flowStatus) =>
          jiraWorkflow.layout.statuses.filter((layoutStatus) => {
            return layoutStatus.id === flowStatus;
          })[0].name
      );
      core.info(generateTransitionFlowLogger(finalTransitionFlow));
      return finalTransitionFlow.slice(1);
    }
  } catch (err) {
    core.info(generateTransitionFlowLogger(err.message));
    return [];
  }
}

function verifyRecursively(srcList, des) {
  const temp = [];
  const destinations = srcList.map((a) => a[1]);
  const uniqueDestinations = [...new Set(destinations)];
  uniqueDestinations.forEach((pqr) => {
    const pairs = findPairsWithThisSourceOrDestination(pqr, 0);
    if (!pairs.length) {
      core.info(
        generateTransitionFlowLogger(
          'No transitions available with these destiations as source'
        )
      );
      throw Error('No transitions available with these destiations as source');
    }
    temp.push(...pairs);
  });
  const intersections = doesSourceAndDestinationMatch(temp, des);
  return [temp, intersections];
}

function getSourceAndDestination(str) {
  const arr = str.split(':').slice(1);
  arr[1] = arr[1].replace('>>', '>');
  return arr;
}

function generateTransitions(jiraWorkflow) {
  const ids = jiraWorkflow.layout.transitions;
  ids.forEach((transition) => {
    const arr = getSourceAndDestination(transition.id);
    transitions.push(arr);
  });
}

function findPairsWithThisSourceOrDestination(point, index) {
  return transitions.filter((transition) => {
    return transition[index] === point;
  });
}

function doesSourceAndDestinationMatch(srcPair, destinationPair) {
  const destinations = srcPair.map((pair) => pair[1]);
  const sources = destinationPair.map((pair) => pair[0]);

  const intersection = sources.filter((source) =>
    destinations.includes(source)
  );

  return intersection;
}

module.exports = {
  generateTransitionFlow,
};
