import { nanoid } from 'nanoid'

import {
  RegisterVoteParams,
  RegisterVotersParams,
  StartVotingParams,
  Vote,
  Voter,
  Voting,
} from './types'

export function startVoting(startVotingParams: StartVotingParams): Voting {
  const { persistVoting, votingParams } = startVotingParams
  console.log('Voting params:', votingParams)
  const voting = {
    ...votingParams,
    votingId: nanoid(),
    startedAt: new Date(),
  }
  persistVoting(voting)
  console.log('Voting started:', voting)
  return voting
}

export function registerVoters(registerVotersParams: RegisterVotersParams): Voter[] {
  const { persistVoters, userIds } = registerVotersParams
  const voters = userIds.map((userId) => ({ voterId: nanoid(), userId }))
  persistVoters(voters)
  console.log('Voters registered:', voters)
  return voters
}

export function registerVote(registerVoteParams: RegisterVoteParams): Vote {
  const { persistVote, voteParams } = registerVoteParams
  const vote = {
    ...voteParams,
    voteId: nanoid(),
    createdAt: new Date(),
  }
  persistVote(vote)
  console.log('Vote registered:', vote)
  return vote
}
