import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import { VoterData, VoterId, VotingId } from '../src/types'

import {
  DEFAULT_CALLBACKS,
  generateVotingId,
  isCandidateBasedVotingType,
  setCallbacks,
} from '../src/common'
import { registerVote, registerVoteByUserId, validateRegisterVote } from '../src/vote'

import {
  candidates,
  retrieveVotingFnEnded,
  retrieveVotingFnOngoing,
  startedBy,
  votingTypes,
} from './common'

chai.use(spies)
chai.use(chaiPromised)

let generatedVotingId: VotingId

function getFirstCandidateId(): VoterId {
  const [firstCandidateId] = candidates
  return firstCandidateId.candidateId
}

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = generateVotingId()
})

describe('Vote', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      const verdict = votingType === 'election' ? 'elect' : 'guilty'
      describe('validateRegisterVote', () => {
        if (isCandidateBasedVotingType(votingType))
          it('cannot vote on yourself', async () => {
            await expect(
              validateRegisterVote({
                votingId: generateVotingId(),
                voterId: startedBy.voterId,
                choices: [
                  {
                    candidateId: startedBy.voterId,
                    verdict,
                  },
                ],
              })
            ).to.be.rejectedWith('Voter cannot vote on themselves')
          })
      })
      describe('registerVote', () => {
        it('should add a vote', async () => {
          const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
          const hasVotedSpy = chai.spy(() => Promise.resolve(false))
          const persistVoteSpy = chai.spy(() =>
            Promise.resolve({
              inserts: 1,
            })
          )

          setCallbacks({
            retrieveVoting: retrieveVotingSpy,
            persistVote: persistVoteSpy,
            hasVoted: hasVotedSpy,
          })

          const response = await registerVote({
            voteParams: {
              votingId: generatedVotingId,
              voterId: startedBy.voterId,
              choices: [
                isCandidateBasedVotingType(votingType)
                  ? {
                      candidateId: getFirstCandidateId(),
                      verdict,
                    }
                  : { value: 'Apple' },
              ],
            },
          })
          const { vote: responseVote } = response

          expect(retrieveVotingSpy).to.have.been.called.once
          expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
          expect(persistVoteSpy).to.have.been.called.once
          expect(persistVoteSpy).to.have.been.called.with(responseVote)
          expect(hasVotedSpy).to.have.been.called.once
          expect(hasVotedSpy).to.have.been.called.with(startedBy.voterId, generatedVotingId)
          expect(responseVote.voteId).to.exist
          expect(responseVote.createdAt).to.exist
        })

        it('should add a vote - by userId', async () => {
          const userId = 'U1ASDF'
          const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
          const hasVotedSpy = chai.spy(() => Promise.resolve(false))
          const persistVoteSpy = chai.spy(() =>
            Promise.resolve({
              inserts: 1,
            })
          )
          const retrieveVoterSpy = chai.spy(() =>
            Promise.resolve({
              data: {
                userId,
                voterId: startedBy.voterId,
              } as VoterData,
            })
          )

          setCallbacks({
            retrieveVoting: retrieveVotingSpy,
            persistVote: persistVoteSpy,
            retrieveVoter: retrieveVoterSpy,
            hasVoted: hasVotedSpy,
          })

          const response = await registerVoteByUserId({
            voteParams: {
              votingId: generatedVotingId,
              userId,
              choices: [
                isCandidateBasedVotingType(votingType)
                  ? {
                      candidateId: getFirstCandidateId(),
                      verdict,
                    }
                  : { value: 'Apple' },
              ],
            },
          })
          const { vote: responseVote } = response

          expect(retrieveVotingSpy).to.have.been.called.once
          expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
          expect(retrieveVoterSpy).to.have.been.called.once
          expect(retrieveVoterSpy).to.have.been.called.with(userId)
          expect(persistVoteSpy).to.have.been.called.once
          expect(persistVoteSpy).to.have.been.called.with(responseVote)
          expect(hasVotedSpy).to.have.been.called.once
          expect(hasVotedSpy).to.have.been.called.with(startedBy.voterId, generatedVotingId)
          expect(responseVote.voteId).to.exist
          expect(responseVote.voterId).to.equal(startedBy.voterId)
          expect(responseVote.createdAt).to.exist
        })

        it('cannot vote again', async () => {
          const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
          const hasVotedSpy = chai.spy(() => Promise.resolve(true))

          setCallbacks({
            retrieveVoting: retrieveVotingSpy,
            hasVoted: hasVotedSpy,
          })

          await expect(
            registerVote({
              voteParams: {
                votingId: generatedVotingId,
                voterId: startedBy.voterId,
                choices: [
                  isCandidateBasedVotingType(votingType)
                    ? {
                        candidateId: getFirstCandidateId(),
                        verdict,
                      }
                    : { value: 'Apple' },
                ],
              },
            })
          ).to.be.rejectedWith('Voter cannot vote again')
          expect(hasVotedSpy).to.have.been.called.once
          expect(hasVotedSpy).to.have.been.called.with(startedBy.voterId, generatedVotingId)
        })

        it('cannot vote after voting has ended', async () => {
          const retrieveVotingSpy = chai.spy(retrieveVotingFnEnded(generatedVotingId, votingType))

          setCallbacks({
            retrieveVoting: retrieveVotingSpy,
          })

          await expect(
            registerVote({
              voteParams: {
                votingId: generatedVotingId,
                voterId: startedBy.voterId,
                choices: [
                  isCandidateBasedVotingType(votingType)
                    ? {
                        candidateId: getFirstCandidateId(),
                        verdict,
                      }
                    : { value: 'Apple' },
                ],
              },
            })
          ).to.be.rejectedWith('Voting has ended')
          expect(retrieveVotingSpy).to.have.been.called.once
          expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        })
      })
    })
  })
  it('voting does not exist', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
    })

    await expect(
      registerVote({
        voteParams: {
          votingId: generatedVotingId,
          voterId: startedBy.voterId,
          choices: [
            {
              candidateId: getFirstCandidateId(),
              verdict: 'pass',
            },
          ],
        },
      })
    ).to.be.rejectedWith('Voting does not exist')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
  })

  it('voter does not exist', async () => {
    const userId = 'U1ASDF'
    const retrieveVoterSpy = chai.spy(() => Promise.resolve({ data: null }))

    setCallbacks({
      retrieveVoter: retrieveVoterSpy,
    })

    await expect(
      registerVoteByUserId({
        voteParams: {
          votingId: generatedVotingId,
          userId,
          choices: [
            {
              candidateId: getFirstCandidateId(),
              verdict: 'pass',
            },
          ],
        },
      })
    ).to.be.rejectedWith('Voter not registered')
    expect(retrieveVoterSpy).to.have.been.called.once
    expect(retrieveVoterSpy).to.have.been.called.with(userId)
  })
})
