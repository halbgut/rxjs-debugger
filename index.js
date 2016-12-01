const R = require('ramda')
const util = require('util')

const getConstructorName = R.path(['constructor', 'name'])
const getSource = R.path(['source'])
const getOperator = R.path(['operator'])
const getProject = R.pipe(getOperator, R.path(['project']))
const getProjectAsString = R.pipe(getProject, R.invoker(0, 'toString'))
const getOperatorProp = (k) => R.pipe(getOperator, R.path([k]))
const getOperatorName = R.pipe(getOperator, getConstructorName)
const getInnerSource = R.path(['source'])
const doAnd = (fa, fb) => x => {
  fa(x)
  return fb(x)
}

module.exports = function MountDebugOperator (Observable) {
  Observable.prototype.debug = function debug () {
    return this.lift(debugOperator(this))
  }
}

function debugOperator ($observable) {
  return {
    call: (subscriber, source) =>
      $observable.subscribe(
        subscriber.next.bind(subscriber),
        (err) => {
          /* print a trace to the error */
          printTrace($observable)
          /* continue on on the normal error path */
          subscriber.error(err)
        },
        subscriber.complete.bind(subscriber)
      ),
  }
}

const doIfEq = comperator => fallback => R.pipe(
  R.map(([operator, fn]) => [comperator(operator), fn]),
  (conditions) => R.cond(R.append([R.T, fallback], conditions))
)

const isOperator = (name) => ($o) => getOperatorName($o) === name
const formatOperator = doIfEq(isOperator)(getOperatorName)([
  ['MergeMapOperator', $o => `.mergeMap(${getProjectAsString($o)})`],
  ['MapOperator', $o => `.map(${getProjectAsString($o)})`],
  ['RetryOperator', $o => `.retry(${getOperatorProp('count')($o)})`],
  ['DelayOperator', $o => `.delay(${getOperatorProp('delay')($o)})`]
])

const print = (...args) => { console.log(`    ${args.join(' ')}`) }
const printOperator = R.pipe(formatOperator, print)

const printTrace = R.cond([
  [getOperator, doAnd(printOperator, $o => printNextTrace($o))],
//  [getOperatorName, doAnd(R.pipe(getOperatorName, print), $o => printNextTrace($o))],
//  [getSource, doAnd(R.pipe(getOperatorName, print), $o => printNextTrace($o))],
])

const printNextTrace = R.cond([
  [getInnerSource, R.pipe(getInnerSource, printTrace)]
])

/* TODO: this only works in v8 */
const getStack = (err = new Error()) => {
  /* Store old trace formatter to reasign later */
  const prepareStackTrace = Error.prepareStackTrace
  /* Get the stack object and the source object */
  Error.prepareStackTrace = R.nthArg(1)
  const stack = err.stack
  /* Reset formatter to initial state */
  Error.prepareStackTrace = prepareStackTrace
  return stack
}

const getCurrentLocation = R.pipe(
  getStack,
  R.head,
  /* get filename, line number and column number from stack */
  R.converge(
    (f, l, c) => `${f} ${l}:${c}`,
    R.map(R.invoker(0), ['getFileName', 'getLineNumber', 'getColumnNumber'])
  )
)
