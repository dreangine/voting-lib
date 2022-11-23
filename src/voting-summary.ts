import {
  getDefaultStats,
  hasVotingEnded,
  isCandidateBasedVoteChoice,
  isCandidateBasedVoting,
  isCandidateStatsElection,
  isCandidateStatsJudgment,
  isOptionBasedVoting,
  isOptionStats,
  retrieveVotes,
  retrieveVoting,
} from './common'
import {
  RetrieveVotingSummaryRequest,
  RetrieveVotingSummaryResponse,
  VotingSummaryState,
  FinalVerdictStats,
  VoteData,
  VotesStats,
  VerdictFinal,
  Election,
  CandidateStatsElection,
  CandidateStatsJudgment,
  PartialVerdict,
  VoterId,
  VotingData,
  OptionsStats,
  VoteChoiceOptionBased,
  VotingStats,
  CandidateVotingData,
  CandidateBasedVotesStats,
} from './types'

function generateVotingSummaryState(isVotingFinal: boolean): VotingSummaryState {
  return isVotingFinal ? 'final' : 'partial'
}

function generateBaseVotesStats(voting: VotingData): VotesStats {
  if (isCandidateBasedVoting(voting)) {
    const defaultStats = getDefaultStats(voting.votingType)
    return voting.candidates.reduce((stats, { candidateId }) => {
      stats[candidateId] = { ...defaultStats }
      return stats
    }, {} as CandidateBasedVotesStats)
  }
  return voting.options !== undefined
    ? voting.options.reduce((stats, value) => {
        stats[value] = 0
        return stats
      }, {} as OptionsStats)
    : ({} as OptionsStats)
}

function generateVotesStatsFromData(voting: VotingData, votesData: VoteData[]): VotesStats {
  return votesData.reduce((votingStats, { choices }) => {
    choices.forEach((choice) => {
      if (isCandidateBasedVoteChoice(choice)) {
        const { candidateId, verdict } = choice
        votingStats[candidateId][verdict]++
      } else {
        const { value } = choice
        votingStats[value] = votingStats[value] ? (votingStats[value] as number) + 1 : 1
      }
    })
    return votingStats
  }, generateBaseVotesStats(voting))
}

function generateVotesStatsFromStats(voting: VotingData, votesStats: VotesStats): VotesStats {
  return Object.entries(votesStats).reduce((votingStats, [statsKey, stats]) => {
    if (isOptionStats(stats)) {
      votingStats[statsKey] = stats
    } else {
      Object.keys(stats).forEach((verdict) => {
        votingStats[statsKey][verdict] = stats[verdict]
      })
    }
    return votingStats
  }, generateBaseVotesStats(voting))
}

function generateVotesStats(
  voting: VotingData,
  votesData: VoteData[] | VotesStats | null
): VotesStats {
  if (!votesData) return generateBaseVotesStats(voting)
  return votesData instanceof Array
    ? generateVotesStatsFromData(voting, votesData)
    : generateVotesStatsFromStats(voting, votesData)
}

function calculateParticipation(votingStats: VotingStats): number {
  const calculatedParticipation = Object.values(votingStats).reduce((total, stats) => {
    if (isCandidateStatsElection(stats)) {
      const { elect, pass } = stats as CandidateStatsElection
      return total + elect + pass
    }
    if (isCandidateStatsJudgment(stats)) {
      const { guilty, innocent } = stats as CandidateStatsJudgment
      return total + guilty + innocent
    }
    return total + stats
  }, 0)
  return calculatedParticipation
}

function generatePartialVerdicts(
  votingStats: VotingStats,
  requiredParticipation: number,
  requiredVotes: number,
  onlyOneSelected: boolean
): PartialVerdict[] {
  const hasEnoughVotes =
    !requiredParticipation || calculateParticipation(votingStats) >= requiredParticipation
  return Object.entries(votingStats).map(([statsKey, stats]) => {
    if (hasEnoughVotes) {
      if (isOptionStats(stats)) {
        if (!requiredVotes || stats >= requiredVotes)
          return { statsKey, verdict: 'pending selected', electVotes: stats }
        return { statsKey, verdict: 'rejected' }
      }
      if (isCandidateStatsElection(stats)) {
        const { elect, pass } = stats as CandidateStatsElection
        if (!requiredVotes || elect >= requiredVotes) {
          if (elect > pass) {
            if (onlyOneSelected) return { statsKey, verdict: 'pending elected', electVotes: elect }
            return { statsKey, verdict: 'elected' }
          }
        }
        return { statsKey, verdict: 'not elected' }
      }
      const { guilty, innocent } = stats as CandidateStatsJudgment
      if (!requiredVotes || guilty + innocent >= requiredVotes) {
        if (guilty > innocent) {
          return { statsKey, verdict: 'guilty' }
        } else if (innocent > guilty) {
          return { statsKey, verdict: 'innocent' }
        }
      }
    }
    return { statsKey, verdict: 'undecided' }
  })
}

function findElectedId(partialVerdicts: PartialVerdict[]): VoterId | string | null {
  const pendingCandidates = partialVerdicts
    .filter(({ verdict }) => verdict.startsWith('pending'))
    .map((verdict) => verdict as Required<PartialVerdict>)
    .sort(({ electVotes: aElectVotes }, { electVotes: bElectVotes }) => bElectVotes - aElectVotes)
  const [firstCandidate, secondCandidate] = pendingCandidates
  return firstCandidate?.electVotes === secondCandidate?.electVotes ? null : firstCandidate.statsKey
}

function generateFinalVerdict(
  partialVerdicts: PartialVerdict[],
  electedId: VoterId | string | null
): FinalVerdictStats {
  return partialVerdicts.reduce((finalVerdict, { statsKey, verdict }) => {
    if (verdict === 'pending elected') {
      finalVerdict[statsKey] = electedId === statsKey ? 'elected' : 'not elected'
    } else if (verdict === 'pending selected') {
      finalVerdict[statsKey] = electedId === statsKey ? 'selected' : 'rejected'
    } else {
      finalVerdict[statsKey] = verdict as VerdictFinal
    }
    return finalVerdict
  }, {} as FinalVerdictStats)
}

function processVotingStats(
  votingStats: VotingStats,
  requiredParticipation: number,
  requiredVotes: number,
  onlyOneSelected = false
): FinalVerdictStats {
  const verdicts = generatePartialVerdicts(
    votingStats,
    requiredParticipation,
    requiredVotes,
    onlyOneSelected
  )
  const electedId = findElectedId(verdicts)
  const finalVerdict = generateFinalVerdict(verdicts, electedId)

  return finalVerdict
}

async function processCandidatesVoting(
  voting: CandidateVotingData,
  votes: VoteData[] | VotesStats | null
): Promise<RetrieveVotingSummaryResponse> {
  const votingStats = generateVotesStats(voting, votes)
  const isVotingFinal = hasVotingEnded(voting)

  const { requiredParticipationPercentage = 0, requiredVotesPercentage = 0, totalVoters } = voting
  const requiredParticipation = Math.ceil(requiredParticipationPercentage * totalVoters)
  const requiredVotes = Math.ceil(requiredVotesPercentage * requiredParticipation)
  const finalVerdict =
    isVotingFinal &&
    processVotingStats(
      votingStats as VotingStats,
      requiredParticipation,
      requiredVotes,
      (voting as Election).onlyOneSelected
    )

  return {
    voting,
    votingStats,
    votingSummaryState: generateVotingSummaryState(isVotingFinal),
    ...(finalVerdict && { finalVerdict }),
  } as RetrieveVotingSummaryResponse
}

function removeInvalidOptionsVotes(votes: VoteData[], validOptions: string[]): void {
  votes.forEach((vote) => {
    const { choices } = vote
    const optionsChoices = choices as VoteChoiceOptionBased[]
    vote.choices = optionsChoices.filter(({ value }) => validOptions.includes(value))
  })
}

async function processOptionsVoting(
  voting: VotingData,
  votes: VoteData[] | VotesStats | null
): Promise<RetrieveVotingSummaryResponse> {
  if (isOptionBasedVoting(voting) && voting.options !== undefined && votes instanceof Array)
    removeInvalidOptionsVotes(votes, voting.options)
  const isVotingFinal = hasVotingEnded(voting)
  const {
    requiredParticipationPercentage = 0,
    requiredVotesPercentage = 0,
    onlyOneSelected = false,
    totalVoters,
  } = voting
  const requiredParticipation = Math.ceil(requiredParticipationPercentage * totalVoters)
  const requiredVotes = Math.ceil(requiredVotesPercentage * requiredParticipation)
  const votingStats = generateVotesStats(voting, votes) as OptionsStats
  const finalVerdict =
    isVotingFinal &&
    processVotingStats(votingStats, requiredParticipation, requiredVotes, onlyOneSelected)
  return {
    voting,
    votingStats,
    votingSummaryState: generateVotingSummaryState(isVotingFinal),
    ...(finalVerdict && { finalVerdict }),
  } as RetrieveVotingSummaryResponse
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

    if (isCandidateBasedVoting(voting)) return processCandidatesVoting(voting, votes)
    return processOptionsVoting(voting, votes)
  })
}
