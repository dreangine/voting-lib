import { DEFAULT_CALLBACKS, DEFAULT_CANDIDATE_STATS, hasVotingEnded } from './common'
import {
  RetrieveVotingSummaryRequest,
  CandidatesStats,
  RetrieveVotingSummaryResponse,
  VotingSummaryState,
  FinalVeredictStats,
  Callbacks,
  VoteData,
  VotesStats,
  VeredictFinal,
  Election,
} from './types'

// Setup
const CALLBACKS: Callbacks = {
  ...DEFAULT_CALLBACKS,
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
}

function generateVotesStats(votesData?: VoteData[] | VotesStats | null): CandidatesStats {
  if (!votesData) return {}
  return votesData instanceof Array
    ? (votesData as VoteData[]).reduce((candidatesStats, { choices }) => {
        choices.forEach(({ candidateId, veredict }) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...DEFAULT_CANDIDATE_STATS,
          }
          candidatesStats[candidateId][veredict]++
        })
        return candidatesStats
      }, {} as CandidatesStats)
    : Object.entries(votesData as VotesStats).reduce(
        (candidatesStats, [candidateId, { guilty = 0, innocent = 0, elect = 0, pass = 0 }]) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...DEFAULT_CANDIDATE_STATS,
          }
          candidatesStats[candidateId].guilty += guilty
          candidatesStats[candidateId].innocent += innocent
          candidatesStats[candidateId].elect += elect
          candidatesStats[candidateId].pass += pass
          return candidatesStats
        },
        {} as CandidatesStats
      )
}

function generateFinalVeredict(
  candidatesStats: CandidatesStats,
  requiredVotes?: number,
  maxElectedCandidates?: number
): FinalVeredictStats {
  const veredicts = Object.entries(candidatesStats).map(
    ([candidateId, { guilty, innocent, elect, pass }]) => {
      if (!requiredVotes || guilty + innocent + elect + pass >= requiredVotes) {
        if (guilty > innocent) {
          return { candidateId, veredict: 'guilty' }
        } else if (innocent > guilty) {
          return { candidateId, veredict: 'innocent' }
        } else if (elect > pass) {
          if (maxElectedCandidates === 1)
            return { candidateId, veredict: 'pending', electVotes: elect }
          return { candidateId, veredict: 'elected' }
        } else if (pass > elect) {
          return { candidateId, veredict: 'not elected' }
        }
      }
      return { candidateId, veredict: 'undecided' }
    }
  )

  const pendingCandidates = veredicts
    .filter(({ veredict }) => veredict === 'pending')
    .sort((a, b) => (b.electVotes ?? 0) - (a.electVotes ?? 0))
  const [firstCandidate, secondCandidate] = pendingCandidates
  const electedCandidate =
    firstCandidate?.electVotes === secondCandidate?.electVotes ? null : firstCandidate

  return veredicts.reduce((finalVeredict, { candidateId, veredict }) => {
    if (veredict === 'pending') {
      finalVeredict[candidateId] =
        electedCandidate?.candidateId === candidateId ? 'elected' : 'not elected'
    } else {
      finalVeredict[candidateId] = veredict as VeredictFinal
    }
    return finalVeredict
  }, {} as FinalVeredictStats)
}

export async function retrieveVotingSummary(
  request: RetrieveVotingSummaryRequest
): Promise<RetrieveVotingSummaryResponse> {
  const { votingId } = request
  return Promise.allSettled([
    CALLBACKS.retrieveVoting(votingId),
    CALLBACKS.retrieveVotes(votingId),
  ]).then((results) => {
    const [votingResult, votesResult] = results
    if (votingResult.status === 'rejected') {
      throw new Error(`Unable to retrieve voting: ${votingResult.reason}`)
    }
    if (votesResult.status === 'rejected') {
      throw new Error(`Unable to retrieve votes: ${votesResult.reason}`)
    }

    const { data: voting } = votingResult.value
    const { data: votes } = votesResult.value

    if (!voting) throw new Error('Voting not found')

    const baseStats: CandidatesStats = voting.candidates.reduce(
      (candidatesStats, { candidateId }) => {
        candidatesStats[candidateId] = { ...DEFAULT_CANDIDATE_STATS }
        return candidatesStats
      },
      {} as CandidatesStats
    )
    const candidatesStats = { ...baseStats, ...generateVotesStats(votes) }
    const isVotingFinal = hasVotingEnded(voting)
    const votingSummaryState: VotingSummaryState = isVotingFinal ? 'final' : 'partial'

    const { requiredParticipationPercentage = 0, totalVoters } = voting
    const requiredVotes = requiredParticipationPercentage * totalVoters
    const finalVeredict =
      isVotingFinal &&
      generateFinalVeredict(
        candidatesStats,
        requiredVotes,
        (voting as Election).maxElectedCandidates
      )

    const response = {
      voting,
      candidatesStats,
      votingSummaryState,
      ...(finalVeredict && { finalVeredict }),
    }
    return response
  })
}
