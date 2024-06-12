# domain-signaling Example: Automatic State Transitions
## Description
This example demonstrates how to use the domain-signaling npm package to create and manage a state machine with automatic state transitions. The states are transitioned automatically using broadcast events.

## Installation
First, you need to install the domain-signaling package. You can do this using npm:
```sh
npm install domain-signaling
```
## Example Code
Here is an example code that sets up a state machine with four states: start, validate, process, and finish. The state transitions happen automatically through broadcast events.

```javascript
const Signaling = require("domain-signaling");

// Initial configurations
const principal = [];
const results = { pattern: '', data: { items: [] }, event: '' };
const location = 'stateMachine';
const rels = [];
const options = {};
const lifecycle = {
  initEvent: 'start',
  prevEvent: '',
  startedEvent: '',
  postEvent: '',
  option: 'mainFlow',
  param: [],
  params: [],
  items: { service: [], events: [], events_order: [] }
};
const events_order = [
  { rel: 'mainFlow', items: ['start', 'validate', 'process', 'finish'] }
];
const events = [
  { rel: 'mainFlow', items: { 'start': {}, 'validate': {}, 'process': {}, 'finish': {} } }
];
const transitionEvent = null;
const domainName = 'workflow';
const userGroup = 'users';
const users = [];

// Initialize signaling
const signaling = new Signaling(
  principal,
  results,
  location,
  rels,
  options,
  lifecycle,
  events_order,
  events,
  transitionEvent,
  domainName,
  userGroup,
  users
);

// Function to execute the automatic transition between states
async function runWorkflow() {
  const switchCallback = (lifecycle, switchEvent) => {
    console.log(Current State: ${lifecycle.initEvent});

    // Find the next state from events_order
    const currentRel = events_order.find(order => order.rel === lifecycle.option);
    if (!currentRel) {
      console.error(Rel not found: ${lifecycle.option});
      return;
    }

    const currentIndex = currentRel.items.indexOf(lifecycle.initEvent);
    if (currentIndex === -1) {
      console.error(Current event not found: ${lifecycle.initEvent});
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= currentRel.items.length) {
      console.log('All transitions completed.');
      return;
    }

    lifecycle.initEvent = currentRel.items[nextIndex];

    signaling.execute(
      lifecycle,
      switchCallback,
      loadPanelCallback,
      broadcastCallback,
      httpRequestCallback,
      loadCacheCallback,
      loadRulesCallback
    );
  };

  const loadPanelCallback = (name, lifecycle, html, size) => {
    return new Promise((resolve) => {
      console.log(Load panel: ${name});
      resolve(true);
    });
  };

  const httpRequestCallback = (url, method, cache, data, headers, rel, name, message) => {
    return new Promise((resolve) => {
      console.log(HTTP request: ${method} ${url});
      resolve({}); // mock response data
    });
  };

  const loadCacheCallback = (lifecycle, rel) => {
    return new Promise((resolve) => {
      console.log(Load cache: ${rel});
      resolve(true);
    });
  };

  const loadRulesCallback = (lifecycle, cb) => {
    return new Promise((resolve) => {
      console.log('Load rules');
      resolve(true);
    });
  };

  const broadcastCallback = (eventName, lifecycle) => {
    return new Promise((resolve) => {
      console.log(Broadcast event: ${eventName});
      resolve(true);
    }).then(() => {
      switchCallback(lifecycle, eventName);
    });
  };

  signaling.execute(
    lifecycle,
    switchCallback,
    loadPanelCallback,
    broadcastCallback,
    httpRequestCallback,
    loadCacheCallback,
    loadRulesCallback
  );
}

// Run the workflow
runWorkflow();
```
##Explanation
###Configuration
**principal, results, location, rels, options, lifecycle, events_order, events, transitionEvent, domainName, userGroup, users**: These are the initial configurations for the state machine and signaling instance.
**signaling**: This initializes the domain-signaling instance with the provided configurations.
###Callbacks
**switchCallback**: Manages the state transitions. It logs the current state and finds the next state from the events_order. If all transitions are completed, it stops further transitions.
**loadPanelCallback, httpRequestCallback, loadCacheCallback, loadRulesCallback, broadcastCallback**: These are mocked callback functions that simulate various asynchronous operations required during state transitions.
###Execution
**runWorkflow**: This function initiates the state machine by calling signaling.execute with the necessary callbacks. The state transitions occur automatically through the broadcastCallback which triggers the switchCallback.
###Running the Example
To run this example, save the code in a file (e.g., workflow.js) and execute it using Node.js:
```shell script
node workflow.js
```
You should see the states transition in the console output as follows:
```sql
Current State: start
Broadcast event: start
Current State: validate
Broadcast event: validate
Current State: process
Broadcast event: process
Current State: finish
All transitions completed.
```
##License
This project is licensed under the MIT License.