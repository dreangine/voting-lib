import {
  CandidatesStats,
  FinalVerdictStatsElection,
  FinalVerdictStatsJudgment,
  OptionsStats,
  VoteData,
  VoterData,
  VotingData,
  VotingSummaryState,
} from '../src/types'

export type Scenario = {
  description: string
  currentDate: Date
  voters: VoterData[]
  voting: VotingData
  votes: VoteData[]
  expected: {
    votingStats: CandidatesStats | OptionsStats
    votingSummaryState: VotingSummaryState
    finalVerdict?: FinalVerdictStatsElection | FinalVerdictStatsJudgment
  }
}
