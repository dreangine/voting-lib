import {
  checkCallbacks,
  registerVoters,
  registerVoting,
  registerVote,
  retrieveVotingSummary,
} from '../dist/index.js'
import { users } from './common.mjs'

const votersResponse = await registerVoters({
  users: users,
})
console.log('Voters:', votersResponse)

const { voters } = votersResponse
const [firstVoter, ...otherVoters] = voters
const { voterId: startedBy } = firstVoter
const candidates = otherVoters.map(({ voterId: candidateId, alias }) => ({ candidateId, alias }))

const votingResponse = await registerVoting({
  votingParams: {
    votingDescription: 'Just a test',
    votingType: 'election',
    startedBy,
    candidates,
    endsAt: (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })(),
    onlyOneSelected: true,
  },
})
const { voting: votingData } = votingResponse
console.log('Voting:', votingResponse)

const { votingId } = votingData

const voteResponse = await registerVote({
  voteParams: {
    votingId,
    voterId: startedBy,
    choices: [
      {
        candidateId: candidates[0].candidateId,
        verdict: 'elect',
      },
    ],
  },
})

console.log('Vote', voteResponse)

const votingSummaryResponse = await retrieveVotingSummary({
  votingId,
})

console.log('Voting summary:', votingSummaryResponse)

console.log('Checking callbacks', await checkCallbacks())
