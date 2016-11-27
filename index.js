const R = require('ramda')

const getConstructorName = R.path(['constructor', 'name'])
const getSource = R.path(['source'])
const getOperator = R.path(['operator'])
const getProject = R.pipe(getOperator, R.path(['project']))
const getProjectAsString = R.pipe(getProject, R.invoker(0, 'toString'))
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

function debugOperator (observable) {
  return {
    call: (subscriber) =>
      observable.subscribe(
        subscriber.next.bind(subscriber),
        () => printTrace(observable),
        subscriber.complete.bind(subscriber)
      )
  }
}

const print = (...args) => { console.log(`    ${args.join(' ')}`) }
const printOperatorNameAndFunction = R.converge(print, [getOperatorName, getProjectAsString])

const printTrace = R.cond([
  [getProject, doAnd(printOperatorNameAndFunction, $o => printNextTrace($o))],
  [getOperatorName, doAnd(R.pipe(getOperatorName, print), $o => printNextTrace($o))],
  [getSource, doAnd(R.pipe(getOperatorName, print), $o => printNextTrace($o))],
])

const printNextTrace = R.cond([
  [getInnerSource, R.pipe(getInnerSource, printTrace)]
])
