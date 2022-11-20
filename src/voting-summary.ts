import {
  getDefaultStats,
  hasVotingEnded,
  isCandidateBasedVotingType,
  isOptionBasedVotingType,
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
  VotingType,
  CandidateStatsElection,
  CandidateStatsJudgment,
  PartialVerdict,
  VoterId,
  VotingData,
  OptionsStats,
  VoteChoiceOptionBased,
  VotingStats,
} from './types'

function generateVotingSummaryState(isVotingFinal: boolean): VotingSummaryState {
  return isVotingFinal ? 'final' : 'partial'
}

function generateVotesStatsFromData(votingType: VotingType, votesData: VoteData[]): VotesStats {
  return votesData.reduce((votingStats, { choices }) => {
    choices.forEach((choice) => {
      if ('candidateId' in choice) {
        const { candidateId, verdict } = choice
        votingStats[candidateId] = votingStats[candidateId] || {
          ...getDefaultStats(votingType),
        }
        votingStats[candidateId][verdict]++
      } else {
        const { value } = choice
        votingStats[value] = votingStats[value] ? (votingStats[value] as number) + 1 : 1
      }
    })
    return votingStats
  }, {} as VotingStats)
}

function generateVotesStatsFromStats(votingType: VotingType, votesStats: VotesStats): VotesStats {
  if (isOptionBasedVotingType(votingType)) return votesStats as OptionsStats
  return Object.entries(votesStats).reduce((votingStats, [candidateId, stats]) => {
    votingStats[candidateId] = votingStats[candidateId] || {
      ...getDefaultStats(votingType),
    }
    Object.keys(stats).forEach((verdict) => {
      votingStats[candidateId][verdict] = stats[verdict]
    })
    return votingStats
  }, {} as VotingStats)
}

function generateVotesStats(
  votingType: VotingType,
  votesData?: VoteData[] | VotesStats | null
): VotesStats {
  if (!votesData) return {}
  return votesData instanceof Array
    ? generateVotesStatsFromData(votingType, votesData)
    : generateVotesStatsFromStats(votingType, votesData)
}

function generatePartialVerdicts(
  votingStats: VotingStats,
  requiredVotes = 0,
  onlyOneSelected = false
): PartialVerdict[] {
  return Object.entries(votingStats).map(([statsKey, stats]) => {
    if (Number.isInteger(stats)) {
      if (!requiredVotes || stats >= requiredVotes)
        return { statsKey, verdict: 'pending selected', electVotes: stats }
      return { statsKey, verdict: 'rejected' }
    }
    if ('elect' in stats) {
      const { elect, pass } = stats as CandidateStatsElection
      if (!requiredVotes || elect >= requiredVotes) {
        if (elect > pass) {
          if (onlyOneSelected) return { statsKey, verdict: 'pending elected', electVotes: elect }
          return { statsKey, verdict: 'elected' }
        } else if (pass > elect) {
          return { statsKey, verdict: 'not elected' }
        }
      }
      return { statsKey, verdict: 'not elected' }
    }
    if ('guilty' in stats) {
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
  requiredVotes = 0,
  onlyOneSelected = false
): FinalVerdictStats {
  const verdicts = generatePartialVerdicts(votingStats, requiredVotes, onlyOneSelected)
  const electedId = findElectedId(verdicts)
  const finalVerdict = generateFinalVerdict(verdicts, electedId)

  return finalVerdict
}

async function processCandidatesVoting(
  voting: VotingData,
  votes: VoteData[] | VotesStats | null
): Promise<RetrieveVotingSummaryResponse> {
  if ('candidates' in voting) {
    const { votingType, candidates } = voting
    if (candidates.length) {
      const baseStats: VotingStats = candidates.reduce((votingStats, { candidateId }) => {
        votingStats[candidateId] = {
          ...getDefaultStats(votingType),
        }
        return votingStats
      }, {} as VotingStats)
      const votingStats = {
        ...baseStats,
        ...(generateVotesStats(votingType, votes) as VotingStats),
      }
      const isVotingFinal = hasVotingEnded(voting)

      const { requiredParticipationPercentage = 0, totalVoters } = voting
      const requiredVotes = Math.ceil(
        (requiredParticipationPercentage * totalVoters) / candidates.length
      )
      const finalVerdict =
        isVotingFinal &&
        processVotingStats(
          votingStats as VotingStats,
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
  }
  throw new Error('Voting has no candidates')
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
  if ('options' in voting && votes instanceof Array)
    removeInvalidOptionsVotes(votes, voting.options || [])
  const isVotingFinal = hasVotingEnded(voting)
  const {
    requiredParticipationPercentage = 0,
    requiredVotesPercentage = 0,
    onlyOneSelected = false,
    totalVoters,
  } = voting
  const requiredVotes = Math.ceil(requiredParticipationPercentage * totalVoters)
  const requiredIndividualVotes = Math.ceil(requiredVotesPercentage * requiredVotes)
  const votingStats = generateVotesStats(voting.votingType, votes) as OptionsStats
  const finalVerdict =
    isVotingFinal && processVotingStats(votingStats, requiredIndividualVotes, onlyOneSelected)
  return {
    voting,
    votingStats: generateVotesStats(voting.votingType, votes) as OptionsStats,
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

    const { votingType } = voting

    if (isCandidateBasedVotingType(votingType)) return processCandidatesVoting(voting, votes)
    return processOptionsVoting(voting, votes)
  })
}
