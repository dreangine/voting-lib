import {
  CALLBACKS,
  DEFAULT_MAX_VOTING_DURATION,
  DEFAULT_MIN_CANDIDATES_ELECTION,
  DEFAULT_MIN_VOTING_DURATION,
  generateVotingId,
} from './common'
import {
  VotingData,
  RegisterVotingRequest,
  RegisterVotingResponse,
  VotingParamsValidate,
} from './types'

// Setup
export const MIN_VOTING_DURATION: number = +(
  process.env.MIN_VOTING_DURATION ?? DEFAULT_MIN_VOTING_DURATION
)
export const MAX_VOTING_DURATION: number = +(
  process.env.MAX_VOTING_DURATION ?? DEFAULT_MAX_VOTING_DURATION
)
export const MIN_CANDIDATES_ELECTION: number = +(
  process.env.MIN_CANDIDATES_ELECTION ?? DEFAULT_MIN_CANDIDATES_ELECTION
)

async function validateRegisterVoting(votingParams: VotingParamsValidate): Promise<void> {
  const { startedBy, candidates, startsAt, endsAt, votingType } = votingParams

  if (endsAt < startsAt) throw new Error('Voting cannot end before it starts')
  const timeDiff = endsAt.getTime() - startsAt.getTime()
  if (timeDiff < MIN_VOTING_DURATION) throw new Error('Voting duration is too short')
  if (timeDiff > MAX_VOTING_DURATION) throw new Error('Voting duration is too long')
  if (candidates.length < MIN_CANDIDATES_ELECTION && votingType === 'election')
    throw new Error(`Election must have at least ${MIN_CANDIDATES_ELECTION} candidates`)

  const candidatesIds = candidates.map(({ candidateId }) => candidateId)
  if (candidatesIds.includes(startedBy)) throw new Error('Voting cannot be started by a candidate')
  const allVoters = [startedBy, ...candidatesIds]
  const checkedVoters = await CALLBACKS.checkActiveVoters(allVoters)
  const notFoundVoterIds = allVoters.filter((candidate) => !checkedVoters[candidate])
  if (notFoundVoterIds.length) throw new Error(`Voters ${notFoundVoterIds.join(', ')} do not exist`)
}

export async function registerVoting(
  request: RegisterVotingRequest
): Promise<RegisterVotingResponse> {
  const now = new Date()
  const { votingParams } = request
  const { startsAt = now } = votingParams

  await validateRegisterVoting({ ...votingParams, startsAt })

  // Get the total amount of active voters when voting starts
  const totalVoters = await CALLBACKS.countActiveVoters()

  const voting: VotingData = {
    ...votingParams,
    startsAt,
    votingId: await generateVotingId(),
    totalVoters,
    createdAt: now,
    updatedAt: now,
  }
  await CALLBACKS.persistVoting(voting)
  return { voting }
}
