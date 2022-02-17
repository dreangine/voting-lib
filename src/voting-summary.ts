import { getDefaultStats, hasVotingEnded, retrieveVotes, retrieveVoting } from './common'
import {
  RetrieveVotingSummaryRequest,
  CandidatesStats,
  RetrieveVotingSummaryResponse,
  VotingSummaryState,
  FinalVerdictStats,
  VoteData,
  VotesStats,
  VerdictFinal,
  Election,
  VotingType,
  CandidateStatsElection,
  CandidateStatsJudgment,
  PartialVerdict,
  VoterId,
} from './types'

function generateVotesStats(
  votingType: VotingType,
  votesData?: VoteData[] | VotesStats | null
): CandidatesStats {
  if (!votesData) return {}
  return votesData instanceof Array
    ? (votesData as VoteData[]).reduce((votingStats, { choices }) => {
        choices.forEach(({ candidateId, verdict }) => {
          votingStats[candidateId] = votingStats[candidateId] || {
            ...getDefaultStats(votingType),
          }
          votingStats[candidateId][verdict]++
        })
        return votingStats
      }, {} as CandidatesStats)
    : Object.entries(votesData as VotesStats).reduce((votingStats, [candidateId, stats]) => {
        votingStats[candidateId] = votingStats[candidateId] || {
          ...getDefaultStats(votingType),
        }
        Object.keys(stats).forEach((verdict) => {
          votingStats[candidateId][verdict] = stats[verdict]
        })
        return votingStats
      }, {} as CandidatesStats)
}

function generatePartialVerdicts(
  votingStats: CandidatesStats,
  requiredVotes?: number,
  maxElectedCandidates?: number
): PartialVerdict[] {
  return Object.entries(votingStats).map(([candidateId, stats]) => {
    if (Object.prototype.hasOwnProperty.call(stats, 'elect')) {
      const { elect, pass } = stats as CandidateStatsElection
      if (!requiredVotes || elect >= requiredVotes) {
        if (elect > pass) {
          if (maxElectedCandidates === 1)
            return { candidateId, verdict: 'pending', electVotes: elect }
          return { candidateId, verdict: 'elected' }
        } else if (pass > elect) {
          return { candidateId, verdict: 'not elected' }
        }
      }
      return { candidateId, verdict: 'not elected' }
    } else {
      const { guilty, innocent } = stats as CandidateStatsJudgment
      if (!requiredVotes || guilty + innocent >= requiredVotes) {
        if (guilty > innocent) {
          return { candidateId, verdict: 'guilty' }
        } else if (innocent > guilty) {
          return { candidateId, verdict: 'innocent' }
        }
      }
    }
    return { candidateId, verdict: 'undecided' }
  })
}

function findElectedCandidateId(partialVerdicts: PartialVerdict[]): VoterId | null {
  const pendingCandidates = partialVerdicts
    .filter(({ verdict }) => verdict === 'pending')
    .map((verdict) => verdict as Required<PartialVerdict>)
    .sort(({ electVotes: aElectVotes }, { electVotes: bElectVotes }) => bElectVotes - aElectVotes)
  const [firstCandidate, secondCandidate] = pendingCandidates
  return firstCandidate?.electVotes === secondCandidate?.electVotes
    ? null
    : firstCandidate.candidateId
}

function generateFinalVerdict(
  partialVerdicts: PartialVerdict[],
  electedCandidateId: VoterId | null
): FinalVerdictStats {
  return partialVerdicts.reduce((finalVerdict, { candidateId, verdict }) => {
    if (verdict === 'pending') {
      finalVerdict[candidateId] = electedCandidateId === candidateId ? 'elected' : 'not elected'
    } else {
      finalVerdict[candidateId] = verdict as VerdictFinal
    }
    return finalVerdict
  }, {} as FinalVerdictStats)
}

function processCandidatesStats(
  votingStats: CandidatesStats,
  requiredVotes?: number,
  maxElectedCandidates?: number
): FinalVerdictStats {
  const verdicts = generatePartialVerdicts(votingStats, requiredVotes, maxElectedCandidates)
  const electedCandidate = findElectedCandidateId(verdicts)
  const finalVerdict = generateFinalVerdict(verdicts, electedCandidate)

  return finalVerdict
}

export async function retrieveVotingSummary(
  request: RetrieveVotingSummaryRequest
): Promise<RetrieveVotingSummaryResponse> {
  const { votingId } = request
  return Promise.allSettled([retrieveVoting(votingId), retrieveVotes(votingId)]).then((results) => {
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

    const baseStats: CandidatesStats = voting.candidates.reduce((votingStats, { candidateId }) => {
      votingStats[candidateId] = {
        ...getDefaultStats(votingType),
      }
      return votingStats
    }, {} as CandidatesStats)
    const votingStats = { ...baseStats, ...generateVotesStats(votingType, votes) }
    const isVotingFinal = hasVotingEnded(voting)
    const votingSummaryState: VotingSummaryState = isVotingFinal ? 'final' : 'partial'

    const { requiredParticipationPercentage = 0, totalVoters } = voting
    const requiredVotes = requiredParticipationPercentage * totalVoters
    const finalVerdict =
      isVotingFinal &&
      processCandidatesStats(votingStats, requiredVotes, (voting as Election).maxElectedCandidates)

    const response = {
      voting,
      votingStats,
      votingSummaryState,
      ...(finalVerdict && { finalVerdict }),
    }
    return response
  })
}
