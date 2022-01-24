import { DEFAULT_CALLBACKS, getDefaultStats, hasVotingEnded } from './common'
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
  VotingType,
  CandidateStatsElection,
  CandidateStatsJudgement,
} from './types'

// Setup
const CALLBACKS: Callbacks = {
  ...DEFAULT_CALLBACKS,
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
}

function generateVotesStats(
  votingType: VotingType,
  votesData?: VoteData[] | VotesStats | null
): CandidatesStats {
  if (!votesData) return {}
  return votesData instanceof Array
    ? (votesData as VoteData[]).reduce((candidatesStats, { choices }) => {
        choices.forEach(({ candidateId, veredict }) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...getDefaultStats(votingType),
          }
          candidatesStats[candidateId][veredict]++
        })
        return candidatesStats
      }, {} as CandidatesStats)
    : Object.entries(votesData as VotesStats).reduce((candidatesStats, [candidateId, stats]) => {
        candidatesStats[candidateId] = candidatesStats[candidateId] || {
          ...getDefaultStats(votingType),
        }
        Object.keys(stats).forEach((veredict) => {
          candidatesStats[candidateId][veredict] = stats[veredict]
        })
        return candidatesStats
      }, {} as CandidatesStats)
}

function generateFinalVeredict(
  candidatesStats: CandidatesStats,
  requiredVotes?: number,
  maxElectedCandidates?: number
): FinalVeredictStats {
  const veredicts = Object.entries(candidatesStats).map(([candidateId, stats]) => {
    if (Object.hasOwnProperty.call(stats, 'elect')) {
      const { elect, pass } = stats as CandidateStatsElection
      if (!requiredVotes || elect + pass >= requiredVotes) {
        if (elect > pass) {
          if (maxElectedCandidates === 1)
            return { candidateId, veredict: 'pending', electVotes: elect }
          return { candidateId, veredict: 'elected' }
        } else if (pass > elect) {
          return { candidateId, veredict: 'not elected' }
        }
      }
    } else {
      const { guilty, innocent } = stats as CandidateStatsJudgement
      if (!requiredVotes || guilty + innocent >= requiredVotes) {
        if (guilty > innocent) {
          return { candidateId, veredict: 'guilty' }
        } else if (innocent > guilty) {
          return { candidateId, veredict: 'innocent' }
        }
      }
    }
    return { candidateId, veredict: 'undecided' }
  })

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

    const { votingType } = voting

    const baseStats: CandidatesStats = voting.candidates.reduce(
      (candidatesStats, { candidateId }) => {
        candidatesStats[candidateId] = {
          ...getDefaultStats(votingType),
        }
        return candidatesStats
      },
      {} as CandidatesStats
    )
    const candidatesStats = { ...baseStats, ...generateVotesStats(votingType, votes) }
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
