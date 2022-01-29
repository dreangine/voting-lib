# voting-lib

A library to manage voting systems, having its own voting rules and options while giving its consumer the choice on how to store the data and manage user security.

## Objectives

- **Transparency**: to have open and traceable votes without revealing real user data
- **Flexibility**: to allow the voter to decide how their vote will be composed and to support multiple voting methods, including:
  - **Election**: each person votes for one candidate and the elected candidate is the one with the most votes
  - **Judgment**: each person votes for one or more candidates and the guilty ones are the ones with more votes for guilty than for innocent

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
- `hasVoted` to check if a voter has already submited a vote for a given voting

### Environment variables

- `MIN_VOTING_DURATION`: minimum duration of a voting in miliseconds
- `MAX_VOTING_DURATION`: maximum duration of a voting in miliseconds
- `MIN_CANDIDATES_ELECTION`: minimum number of candidates for an election

## Rules

- All participants must be registered prior to starting the voting
- A voting cannot be started by a candidate
- A voter cannot vote on themselves
- A voter can only vote once
- A voter cannot vote on a voting that has already ended
- The vote is immutable

## Usage

See the [examples](examples/) folder for some examples of usage.
