# voting-lib

A library to manage voting systems, having its own voting rules and options while giving its consumer the choice on how to store the data and manage user security.

## Objectives

- **Transparency**: to have open and traceable votes without revealing real user data
- **Flexibility**: to support multiple voting methods, including:
  - **Election**: each person votes for one candidate and the elected candidate is the one with the most votes
  - **Judgement**: each person votes for one or more candidates the the guilty ones are the ones with more votes for guilty than for innocent

## Installation

    $ npm i voting-lib

## Setup

You should configure all the callbacks necessary to handle the data (wherever and however it is stored). This can be done using the method `setCallbacks` passing all or some of the callbacks.

```javascript
import { setCallbacks } from 'voting-system'

setCallbacks({
  persistVote: () => {...},
  persistVoters: () => {...},
  persistVoting: () => {...},
  retrieveVoting: () => {...},
  retrieveVoter: () => {...},
  retrieveVotes: () => {...},
  ...
})
```

This method can be called any number of times to change all or some of the callbacks, but it is important that all the callbacks are set before calling any of the functions that manipulate the data.
