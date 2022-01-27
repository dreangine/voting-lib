import { CandidateInfo, Voter, VoterId, VotingData, VotingId, VotingType } from '../src/types'

// Setup
export const nowDate = new Date()
export const yesterdayDate = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24)
export const beforeYesterdayDate = new Date(yesterdayDate.getTime() - 1000 * 60 * 60 * 24)
export const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
export const votingTypes: VotingType[] = ['election', 'judgement']
export const startedBy: Voter = {
  voterId: 'voter-123456',
  userId: 'user-123456',
  alias: 'John Doe',
  status: 'active',
}
export const candidates: CandidateInfo[] = [
  { voterId: 'voter-111111', userId: 'user-111111', alias: 'Jack Bummer', status: 'active' },
  { voterId: 'voter-222222', userId: 'user-222222', alias: 'Claire Corn', status: 'active' },
].map(({ voterId, alias }) => ({ candidateId: voterId, alias }))
export const totalVoters: number = candidates.length + 1
export const allVotersIds: VoterId[] = [
  startedBy.voterId,
  ...candidates.map(({ candidateId }) => candidateId),
]

function generateVotingBase(): Pick<
  VotingData,
  'votingDescription' | 'startedBy' | 'candidates' | 'totalVoters'
> {
  return {
    votingDescription: {
      'en-US': 'Test voting',
    },
    startedBy: startedBy.voterId,
    candidates,
    totalVoters: candidates.length + 1,
  }
}

export function generateVotingDataOngoing(votingId: VotingId, votingType: VotingType): VotingData {
  return {
    ...generateVotingBase(),
    startsAt: yesterdayDate,
    endsAt: tomorrowDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
    votingId,
    votingType,
    ...(votingType === 'election' ? { maxElectedCandidates: 1 } : { evidences: [] }),
  }
}

export function retrieveVotingFnOngoing(votingId: VotingId, votingType: VotingType) {
  return () =>
    Promise.resolve({
      data: generateVotingDataOngoing(votingId, votingType),
    })
}

export function generateVotingDataEnded(
  votingId: VotingId,
  votingType: VotingType,
  maxElectedCandidates?: number
): VotingData {
  return {
    ...generateVotingBase(),
    startsAt: beforeYesterdayDate,
    endsAt: yesterdayDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
    votingId,
    votingType,
    ...(votingType === 'election'
      ? { maxElectedCandidates: maxElectedCandidates ?? 1 }
      : { evidences: [] }),
  }
}

export function retrieveVotingFnEnded(
  votingId: VotingId,
  votingType: VotingType,
  maxElectedCandidates?: number
) {
  return () =>
    Promise.resolve({
      data: generateVotingDataEnded(votingId, votingType, maxElectedCandidates),
    })
}
