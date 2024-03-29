import {
  checkActiveVoters,
  countActiveVoters,
  generateVotingId,
  isCandidateBasedVotingParams,
  OPTIONS,
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

function validateCandidateBasedVotingParams(votingParams: VotingParamsValidate): void {
  if (!('candidates' in votingParams && votingParams.candidates.length))
    throw new Error('Voting has no candidates')

  const { candidates, startedBy, votingType } = votingParams
  if (candidates.length < OPTIONS.minCandidatesElection && votingType === 'election')
    throw new Error(`Election must have at least ${OPTIONS.minCandidatesElection} candidates`)

  const candidatesIds = candidates.map(({ candidateId }) => candidateId)
  if (!OPTIONS.canCandidateStartVoting && candidatesIds.includes(startedBy))
    throw new Error('Voting cannot be started by a candidate')
}

export async function validateRegisterVoting(votingParams: VotingParamsValidate): Promise<void> {
  const { startedBy, startsAt, endsAt } = votingParams

  if (endsAt < startsAt) throw new Error('Voting cannot end before it starts')
  const timeDiff = endsAt.getTime() - startsAt.getTime()
  if (timeDiff < OPTIONS.minVotingDuration) throw new Error('Voting duration is too short')
  if (timeDiff > OPTIONS.maxVotingDuration) throw new Error('Voting duration is too long')
  const votingVoters = [startedBy]

  if (isCandidateBasedVotingParams(votingParams)) {
    validateCandidateBasedVotingParams(votingParams)
    votingVoters.push(...votingParams.candidates.map(({ candidateId }) => candidateId))
  }
  await checkVoters(...votingVoters)
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
