# voting-lib

A library to manage voting systems, having its own voting rules and options while giving its consumer the choice on how to store the data and manage user security. No dependencies.

## Objectives

- **Transparency**: to have open and traceable votes without revealing real user data
- **Flexibility**: to allow the voter to decide how their vote will be composed and to support multiple voting methods, including:
  - **Election**: each person votes for one candidate and the elected candidate is the one with the most votes
  - **Judgment**: each person votes for one or more candidates and the guilty ones are the ones with more votes for guilty than for innocent

## Installation

    $ npm i voting-lib

## Setup

Some steps are required to setup the library:

### Options

- `minVotingDuration`: minimum duration of a voting in miliseconds
- `maxVotingDuration`: maximum duration of a voting in miliseconds
- `minCandidatesElection`: minimum number of candidates for an election
- `canVoterVoteForHimself`: whether a voter can vote for himself (default: `false`)
- `canCandidateStartVoting`: whether a candidate can start a voting (default: `false`)

These options can be configured by changing the `OPTIONS` object. Default values are provided.

Example:

```javascript
import { OPTIONS } from 'voting-lib'

OPTIONS.minVotingDuration = 1000 * 60 * 60 * 24 // 1 day
OPTIONS.maxVotingDuration = 1000 * 60 * 60 * 24 * 7 // 1 week
OPTIONS.minCandidatesElection = 2
...
```

### Callbacks

You should configure all the callbacks necessary to handle the data (wherever and however it is stored). This can be done using the method `setCallbacks` passing all or some of the callbacks.

- `persistVoting` to persist a voting
- `persistVoters` to persist voters
- `persistVote` to persist a vote
- `retrieveVoting` to retrieve a voting
- `retrieveVoter` to retrieve a voter
- `retrieveVotes` to retrieve votes or votes stats (returning whole votes is discouraged for large data sets, use filters and counts to return stats instead)
- `checkActiveVoters` to check if a set of voters are active
- `countActiveVoters` to count the number of active voters
- `hasVoted` to check if a voter has already submited a vote for a given voting

Example:

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

### Helpers

Some helper functions are provided to help fine tune commonly used data generation and manipulation.

- `getCurrentDate` used to retrieve the current date
- `generateRandomUUID` used to generate a random UUID (defaults to `crypto.randomUUID`)

Example:

```javascript
import { setHelpers } from 'voting-lib'

setHelpers({
  getCurrentDate: () => {...},
  generateRandomUUID: () => {...},
})
```

This method can be called any number of times to change all or some of the helpers.

## Rules

- All participants must be registered prior to starting the voting
- A voter can only vote once
- A voter cannot vote on a voting that has already ended
- The vote is immutable

## Usage

See the [examples](examples/) folder for some examples of usage.
