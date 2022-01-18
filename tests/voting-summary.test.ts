import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  CandidatesStats,
  VoteData,
  VotingData,
  VotingType,
  VoterId,
  VotesStats,
  CandidateStats,
  VotingId,
  CandidateInfo,
} from '../src/types'

import {
  DEFAULT_CALLBACKS,
  DEFAULT_CANDIDATE_STATS,
  generateVoteId,
  generateVoterId,
  generateVotingId,
  retrieveVotingSummary,
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

function generateExpectedStats(...candidatesStats: CandidateStats[]): CandidatesStats {
  const [, ...candidates] = generatedVoters
  return candidates.reduce((stats, candidate, index) => {
    stats[candidate] = candidatesStats[index]
    return stats
  }, {} as CandidatesStats)
}

before(async () => {
  generatedVoters = [await generateVoterId(), await generateVoterId(), await generateVoterId()]
})

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = await generateVotingId()
})

describe('Voting summary', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      it('should retrieve voting summary - ongoing voting', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
                voterId: await generateVoterId(),
                choices: [
                  {
                    candidateId,
                    veredict: vote,
                  },
                ],
                candidateId: candidateId,
                createdAt: new Date(),
              } as VoteData)
          )
        )
        const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('candidates without votes - ongoing voting', async () => {
        const [firstCandidate] = getCandidates()
        const { candidateId: firstCandidateId } = firstCandidate
        const votesDistribution = [
          [firstCandidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidateId, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
                voterId: await generateVoterId(),
                choices: [
                  {
                    candidateId,
                    veredict: vote,
                  },
                ],
                candidateId: candidateId,
                createdAt: new Date(),
              } as VoteData)
          )
        )
        const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            guilty: 0,
            innocent: 0,
            elect: 0,
            pass: 0,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('should retrieve voting summary - ended voting', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesStats: VotesStats = {
          [firstCandidate.candidateId]: {
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          [secondCandidate.candidateId]: {
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          },
        }
        const retrieveVotingSpy = chai.spy(retrieveVotingFnEnded(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: votesStats,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVeredict[secondCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'not elected' : 'innocent'
          )
        }
      })

      it('should retrieve voting summary - ended voting (undecided)', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
                voterId: await generateVoterId(),
                choices: [
                  {
                    candidateId,
                    veredict: vote,
                  },
                ],
                candidateId: candidateId,
                createdAt: new Date(),
              } as VoteData)
          )
        )
        const retrieveVotingSpy = chai.spy(retrieveVotingFnEnded(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate.candidateId]).to.equal('undecided')
          expect(result.finalVeredict[secondCandidate.candidateId]).to.equal('undecided')
        }
      })

      it('should retrieve voting summary - not enough votes', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
                voterId: await generateVoterId(),
                choices: [
                  {
                    candidateId,
                    veredict: vote,
                  },
                ],
                candidateId: candidateId,
                createdAt: new Date(),
              } as VoteData)
          )
        )
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
            totalVoters: 6,
            requiredParticipationPercentage: 0.5,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVeredict[secondCandidate.candidateId]).to.equal('undecided')
        }
      })

      it('no votes - ongoing voting', async () => {
        const retrieveVotingSpy = chai.spy(retrieveVotingFnOngoing(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: null,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats = getCandidates().reduce((candidatesStats, { candidateId }) => {
          candidatesStats[candidateId] = DEFAULT_CANDIDATE_STATS
          return candidatesStats
        }, {} as CandidatesStats)
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('no votes - ended voting', async () => {
        const retrieveVotingSpy = chai.spy(retrieveVotingFnEnded(generatedVotingId, votingType))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: null,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats = getCandidates().reduce((candidatesStats, { candidateId }) => {
          candidatesStats[candidateId] = DEFAULT_CANDIDATE_STATS
          return candidatesStats
        }, {} as CandidatesStats)
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        getCandidates().forEach(({ candidateId }) => {
          expect(result.finalVeredict && result.finalVeredict[candidateId]).to.equal('undecided')
        })
      })
    })
  })

  it('voting not found', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))
    const retrieveVotesSpy = chai.spy(() => Promise.resolve({ data: [] }))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Voting not found')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
  })

  it('unable to retrieve voting', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.reject('Unknown error'))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Unable to retrieve voting: Unknown error')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
  })

  it('unable to retrieve votes', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))
    const retrieveVotesSpy = chai.spy(() => Promise.reject('Unknown error'))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Unable to retrieve votes: Unknown error')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
  })
})
