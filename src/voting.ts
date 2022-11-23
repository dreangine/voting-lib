import {
  checkActiveVoters,
  countActiveVoters,
  generateVotingId,
  isCandidateBasedVotingType,
  MAX_VOTING_DURATION,
  MIN_CANDIDATES_ELECTION,
  MIN_VOTING_DURATION,
  persistVoting,
} from './common'
import {
  VotingData,
  RegisterVotingRequest,
  RegisterVotingResponse,
  VotingParamsValidate,
  VoterId,
} from './types'

async function checkVoters(...votersIds: VoterId[]): Promise<void> {
  const checkedVoters = await checkActiveVoters(votersIds)
  const notFoundVoterIds = votersIds.filter((voter) => !checkedVoters[voter])
  if (notFoundVoterIds.length)
    throw new Error(`Voter(s) ${notFoundVoterIds.join(', ')} do not exist`)
}

async function validateCandidateBasedVotingParams(
  votingParams: VotingParamsValidate
): Promise<void> {
  if (!('candidates' in votingParams && votingParams.candidates.length))
    throw new Error('Voting has no candidates')

  const { candidates, startedBy, votingType } = votingParams
  if (candidates.length < MIN_CANDIDATES_ELECTION && votingType === 'election')
    throw new Error(`Election must have at least ${MIN_CANDIDATES_ELECTION} candidates`)

  const candidatesIds = candidates.map(({ candidateId }) => candidateId)
  if (candidatesIds.includes(startedBy)) throw new Error('Voting cannot be started by a candidate')
  await checkVoters(...candidatesIds)
}

export async function validateRegisterVoting(votingParams: VotingParamsValidate): Promise<void> {
  const { startedBy, startsAt, endsAt, votingType } = votingParams

  if (endsAt < startsAt) throw new Error('Voting cannot end before it starts')
  const timeDiff = endsAt.getTime() - startsAt.getTime()
  if (timeDiff < MIN_VOTING_DURATION) throw new Error('Voting duration is too short')
  if (timeDiff > MAX_VOTING_DURATION) throw new Error('Voting duration is too long')

  if (isCandidateBasedVotingType(votingType)) await validateCandidateBasedVotingParams(votingParams)
  await checkVoters(startedBy)
}

export async function registerVoting(
  request: RegisterVotingRequest
): Promise<RegisterVotingResponse> {
  const now = new Date()
  const { votingParams } = request
  const { startsAt = now } = votingParams

  await validateRegisterVoting({ ...votingParams, startsAt })

  // Get the total amount of active voters when voting starts
  const totalVoters = await countActiveVoters()

  const voting: VotingData = {
    ...votingParams,
    startsAt,
    votingId: generateVotingId(),
    totalVoters,
    createdAt: now,
    updatedAt: now,
  }
  await persistVoting(voting)
  return { voting }
}
