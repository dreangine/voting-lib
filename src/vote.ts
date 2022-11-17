import {
  generateVoteId,
  hasVoted,
  hasVotingEnded,
  persistVote,
  retrieveVoter,
  retrieveVoting,
} from './common'
import {
  RegisterVoteByUserIdRequest,
  RegisterVoteRequest,
  RegisterVoteResponse,
  VoteData,
  VoteParamsValidate,
} from './types'

export async function validateRegisterVote(voteParams: VoteParamsValidate): Promise<void> {
  const { votingId, voterId, choices } = voteParams

  const candidates = choices.map((choice) => choice.candidateId)
  if (candidates.includes(voterId)) throw new Error('Voter cannot vote on themselves')
  const { data: voting } = await retrieveVoting(votingId)
  if (!voting) throw new Error('Voting does not exist')
  if (hasVotingEnded(voting)) throw new Error('Voting has ended')
  const hasVotedResult = await hasVoted(voterId, votingId)
  if (hasVotedResult) throw new Error('Voter cannot vote again')
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const now = new Date()

  await validateRegisterVote(voteParams)

  const vote: VoteData = {
    ...voteParams,
    voteId: generateVoteId(),
    createdAt: now,
  }
  await persistVote(vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const { data: voter } = await retrieveVoter(voteParams.userId)

  // Validate
  if (!voter) throw new Error('Voter not registered')

  const { voterId } = voter
  return registerVote({
    voteParams: {
      voterId,
      ...voteParams,
    },
  })
}
