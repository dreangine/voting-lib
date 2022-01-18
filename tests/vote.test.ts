import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import { VoterData, VotingData, VotingType, VoterId, VotingId, CandidateInfo } from '../src/types'

import {
  DEFAULT_CALLBACKS,
  generateVoterId,
  generateVotingId,
  registerVote,
  registerVoteByUserId,
  setCallbacks,
} from '../src/index'

import { beforeYesterdayDate, tomorrowDate, votingTypes, yesterdayDate } from './common'

chai.use(spies)
chai.use(chaiPromised)

// Setup
let generatedVoters: VoterId[]
let generatedVotingId: VotingId

function retrieveVotingFnOngoing(votingId: VotingId, votingType: VotingType) {
  return () =>
    Promise.resolve({
      data: { ...generateOngoingVotingBase(), votingId, votingType },
    })
}

function retrieveVotingFnEnded(votingId: VotingId, votingType: VotingType) {
  return () =>
    Promise.resolve({
      data: { ...generateEndedVotingBase(), votingId, votingType },
    })
}

function getStartedBy(): VoterId {
  const [startedBy] = generatedVoters
  return startedBy
}

function getCandidates(): CandidateInfo[] {
  const [, ...candidates] = generatedVoters
  return candidates.map((candidate) => ({ candidateId: candidate }))
}

function getFirstCandidateId(): VoterId {
  const [firstCandidateId] = getCandidates()
  return firstCandidateId.candidateId
}

function generateVotingBase(): Pick<
  VotingData,
  'votingDescription' | 'startedBy' | 'candidates' | 'totalVoters'
> {
  return {
    votingDescription: {
      'en-US': 'Test voting',
    },
    startedBy: getStartedBy(),
    candidates: getCandidates(),
    totalVoters: generatedVoters.length,
  }
}

function generateOngoingVotingBase(): Omit<VotingData, 'votingId' | 'votingType'> {
  return {
    ...generateVotingBase(),
    startsAt: yesterdayDate,
    endsAt: tomorrowDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
  }
}

function generateEndedVotingBase(): Omit<VotingData, 'votingId' | 'votingType'> {
  return {
    ...generateVotingBase(),
    startsAt: beforeYesterdayDate,
    endsAt: yesterdayDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
  }
}

before(async () => {
  generatedVoters = [await generateVoterId(), await generateVoterId(), await generateVoterId()]
})

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = await generateVotingId()
})

describe('Vote', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      const veredict = votingType === 'election' ? 'elect' : 'guilty'
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
            voterId: getStartedBy(),
            choices: [
              {
                candidateId: getFirstCandidateId(),
                veredict,
              },
            ],
          },
        })
        const { vote: responseVote } = response

        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(persistVoteSpy).to.have.been.called.once
        expect(persistVoteSpy).to.have.been.called.with(responseVote)
        expect(hasVotedSpy).to.have.been.called.once
        expect(hasVotedSpy).to.have.been.called.with(getStartedBy(), generatedVotingId)
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
              voterId: getStartedBy(),
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
              {
                candidateId: getFirstCandidateId(),
                veredict,
              },
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
        expect(hasVotedSpy).to.have.been.called.with(getStartedBy(), generatedVotingId)
        expect(responseVote.voteId).to.exist
        expect(responseVote.voterId).to.equal(getStartedBy())
        expect(responseVote.createdAt).to.exist
      })

      it('cannot vote on yourself', async () => {
        await expect(
          registerVote({
            voteParams: {
              votingId: await generateVotingId(),
              voterId: getStartedBy(),
              choices: [
                {
                  candidateId: getStartedBy(),
                  veredict,
                },
              ],
            },
          })
        ).to.be.rejectedWith('Voter cannot vote on themselves')
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
              voterId: getStartedBy(),
              choices: [
                {
                  candidateId: getFirstCandidateId(),
                  veredict,
                },
              ],
            },
          })
        ).to.be.rejectedWith('Voter cannot vote again')
        expect(hasVotedSpy).to.have.been.called.once
        expect(hasVotedSpy).to.have.been.called.with(getStartedBy(), generatedVotingId)
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
              voterId: getStartedBy(),
              choices: [
                {
                  candidateId: getFirstCandidateId(),
                  veredict,
                },
              ],
            },
          })
        ).to.be.rejectedWith('Voting has ended')
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
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
          voterId: getStartedBy(),
          choices: [
            {
              candidateId: getFirstCandidateId(),
              veredict: 'pass',
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
              veredict: 'pass',
            },
          ],
        },
      })
    ).to.be.rejectedWith('Voter not registered')
    expect(retrieveVoterSpy).to.have.been.called.once
    expect(retrieveVoterSpy).to.have.been.called.with(userId)
  })
})
