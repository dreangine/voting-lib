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
console.group('Voters:')
console.dir(votersResponse, { depth: null })
console.groupEnd()

const { voters } = votersResponse
const [firstVoter, ...otherVoters] = voters
const { voterId: startedBy } = firstVoter
const candidates = otherVoters.map(({ voterId: candidateId, alias }) => ({ candidateId, alias }))

const votingResponse = await registerVoting({
  votingParams: {
    votingDescription: 'Just a test',
    votingType: 'judgment',
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
console.group('Voting:')
console.dir(votingResponse, { depth: null })
console.groupEnd()

const { votingId } = votingData

const voteResponse = await registerVote({
  voteParams: {
    votingId,
    voterId: startedBy,
    choices: [
      {
        candidateId: candidates[0].candidateId,
        verdict: 'guilty',
      },
    ],
  },
})

console.group('Vote:')
console.dir(voteResponse, { depth: null })
console.groupEnd()

const votingSummaryResponse = await retrieveVotingSummary({
  votingId,
})

console.group('Voting Summary:')
console.dir(votingSummaryResponse, { depth: null })
console.groupEnd()

console.log('Checking callbacks', await checkCallbacks())
