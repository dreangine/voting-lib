import { Callbacks } from './types'
import { setCallbacks as voterSetCallbacks } from './voter'
import { setCallbacks as votingSetCallbacks } from './voting'
import { setCallbacks as voteSetCallbacks } from './vote'
import { setCallbacks as votingSummarySetCallbacks } from './voting-summary'

export { registerVoters } from './voter'
export { registerVoting } from './voting'
export { registerVote, registerVoteByUserId } from './vote'
export { retrieveVotingSummary } from './voting-summary'

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  voterSetCallbacks(newCallbacks)
  votingSetCallbacks(newCallbacks)
  voteSetCallbacks(newCallbacks)
  votingSummarySetCallbacks(newCallbacks)
}
