import { nanoid } from 'nanoid'

import {
  RegisterVoteByUserIdParams,
  RegisterVoteParams,
  RegisterVotersParams,
  StartVotingParams,
  Vote,
  Voter,
  Voting,
} from './types'

export async function startVoting(startVotingParams: StartVotingParams): Promise<Voting> {
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

export async function registerVoters(
  registerVotersParams: RegisterVotersParams
): Promise<Voter[] | null> {
  const { persistVoters, userIds, omitReturnedData } = registerVotersParams
  const voters = userIds.map((userId) => ({ voterId: nanoid(), userId }))
  persistVoters(voters)
  console.log('Voters registered:', voters)
  return omitReturnedData ? null : voters
}

export async function registerVote(registerVoteParams: RegisterVoteParams): Promise<Vote> {
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

export async function registerVoteByUserId(
  registerVoteByUserIdParams: RegisterVoteByUserIdParams
): Promise<Vote> {
  const { persistVote, retrieveVoter, voteParams } = registerVoteByUserIdParams
  const { voterId } = await retrieveVoter(voteParams.userId)
  return registerVote({
    persistVote,
    voteParams: {
      voterId,
      ...voteParams,
    },
  })
}
