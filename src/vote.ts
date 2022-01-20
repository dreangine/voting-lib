import { DEFAULT_CALLBACKS, generateVoteId, hasVotingEnded } from './common'
import {
  RegisterVoteByUserIdRequest,
  RegisterVoteRequest,
  RegisterVoteResponse,
  Callbacks,
  VoteData,
  VoteParamsValidate,
} from './types'

// Setup
const CALLBACKS: Callbacks = {
  ...DEFAULT_CALLBACKS,
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
}

async function validateRegisterVote(voteParams: VoteParamsValidate): Promise<void> {
  const { votingId, voterId, choices } = voteParams

  const candidates = choices.map((choice) => choice.candidateId)
  if (candidates.includes(voterId)) throw new Error('Voter cannot vote on themselves')
  const { data: voting } = await CALLBACKS.retrieveVoting(votingId)
  if (!voting) throw new Error('Voting does not exist')
  if (hasVotingEnded(voting)) throw new Error('Voting has ended')
  const hasVoted = await CALLBACKS.hasVoted(voterId, votingId)
  if (hasVoted) throw new Error('Voter cannot vote again')
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const now = new Date()

  await validateRegisterVote(voteParams)

  const vote: VoteData = {
    ...voteParams,
    voteId: await generateVoteId(),
    createdAt: now,
  }
  await CALLBACKS.persistVote(vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const { data: voter } = await CALLBACKS.retrieveVoter(voteParams.userId)

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
