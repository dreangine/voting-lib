# voting-lib

A library to manage voting systems, having its own voting rules and options while giving its consumer the choice on how to store the data and manage user security.

## Objectives

- **Transparency**: to have open and traceable votes without revealing real user data
- **Flexibility**: to support multiple voting methods, including:
  - **Election**: each person votes for one candidate and the elected candidate is the one with the most votes
  - **Judgement**: each person votes for one or more candidates and the guilty ones are the ones with more votes for guilty than for innocent

## Installation

    $ npm i voting-lib

## Setup

You should configure all the callbacks necessary to handle the data (wherever and however it is stored). This can be done using the method `setCallbacks` passing all or some of the callbacks.

```javascript
import { setCallbacks } from 'voting-lib'

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

### Callbacks

- `persistVoting` to persist a voting
- `persistVoters` to persist voters
- `persistVote` to persist a vote
- `retrieveVoting` to retrieve a voting
- `retrieveVoter` to retrieve a voter
- `retrieveVotes` to retrieve votes or votes stats (returning whole votes is discouraged for large data sets, use filters and counts to return stats instead)
- `checkActiveVoters` to check if a set of voters are active
- `countActiveVoters` to count the number of active voters

## Rules

- All participants must be registered prior to starting the voting
- A voting cannot be started by a candidate

## Usage

### Registering a voter

```javascript
const request = {
  userIds: ['<userId1>', '<userId2>', ...],
}
const response = await registerVoters(request)
```

### Election

#### Starting an election

```javascript
const request = {
  votingParams: {
    votingDescription: {
      'en-US': 'Test voting',
    },
    votingType: 'election',
    startedBy: '<voterId>',
    candidates: ['<candidateId>', ...],
    startsAt: new Date(),
    endsAt: (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })(),
  },
}

const response = await startVoting(request)
```

#### Registering an election vote

```javascript
const request = {
  voteParams: {
    votingId: '<votingId>',
    voterId: '<voterId>',
    choices: [
      {
        candidateId: '<candidateId>',
        veredict: '<elect|pass>',
      },
    ],
  },
}

const response = await registerVote(request)
```

### Judgement

#### Starting a judgement

```javascript
const request = {
  votingParams: {
    votingDescription: {
      'en-US': 'Test voting',
    },
    votingType: 'judgement',
    startedBy: '<voterId>',
    candidates: ['<candidateId>', ...],
    endsAt: (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })(),
    evidences: [
      {
        type: 'text',
        data: 'This is the evidence',
      },
      {
        type: 'image',
        data: '<imageUrl>',
      },
    ]
  },
}

const response = await startVoting(request)
```

#### Registering a judgement vote

```javascript
const request = {
  voteParams: {
    votingId: '<votingId>',
    voterId: '<voterId>',
    choices: [
      {
        candidateId: '<candidateId>',
        veredict: '<innocent|guilty>',
      },
    ],
  },
}

const response = await registerVote(request)
```

### Retrieving the summary

```javascript
const request = {
  votingId: '<votingId>',
}

const result = await retrieveVotingSummary(request)
```
