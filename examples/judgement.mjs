import {
  registerVoters,
  registerVoting,
  registerVote,
  retrieveVotingSummary,
} from '../dist/index.js'
import { users } from './common.mjs'

const votersResponse = await registerVoters({
  users: users,
})
const voters = votersResponse.voters.map((voter) => voter.voterId)
console.log('Voters:', votersResponse)

const [startedBy, ...candidates] = voters

const votingResponse = await registerVoting({
  votingParams: {
    votingDescription: 'Just a test',
    votingType: 'judgement',
    startedBy,
    candidates,
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
    ],
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
        candidateId: candidates[0],
        veredict: 'guilty',
      },
    ],
  },
})

console.log('Vote', voteResponse)

const votingSummaryResponse = await retrieveVotingSummary({
  votingId,
})

console.log('Voting summary:', votingSummaryResponse)
