import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  CandidatesStats,
  VoteData,
  VotingData,
  VotesStats,
  CandidateStats,
  VotingId,
} from '../src/types'

import {
  DEFAULT_CALLBACKS,
  generateVoteId,
  generateVoterId,
  generateVotingId,
  getDefaultStats,
} from '../src/common'
import { retrieveVotingSummary, setCallbacks } from '../src/voting-summary'

import {
  candidates,
  generateVotingDataEnded,
  retrieveVotingFnEnded,
  retrieveVotingFnOngoing,
  votingTypes,
} from './common'

chai.use(spies)
chai.use(chaiPromised)

// Setup
let generatedVotingId: VotingId

function generateExpectedStats(...candidatesStats: CandidateStats[]): CandidatesStats {
  return candidates
    .map(({ candidateId }) => candidateId)
    .reduce((stats, candidate, index) => {
      stats[candidate] = candidatesStats[index]
      return stats
    }, {} as CandidatesStats)
}

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = await generateVotingId()
})

describe('Voting summary', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      it('should retrieve voting summary - ongoing voting', async () => {
        const [firstCandidate, secondCandidate] = candidates
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
            ...getDefaultStats(votingType),
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...getDefaultStats(votingType),
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
        const [firstCandidate] = candidates
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
            ...getDefaultStats(votingType),
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...getDefaultStats(votingType),
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
        const [firstCandidate, secondCandidate] = candidates
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
            ...getDefaultStats(votingType),
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...getDefaultStats(votingType),
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

      if (votingType === 'election') {
        it('election single - ended voting (tie)', async () => {
          const [firstCandidate, secondCandidate] = candidates
          const votesStats: VotesStats = {
            [firstCandidate.candidateId]: {
              ['elect']: 2,
              ['pass']: 1,
            },
            [secondCandidate.candidateId]: {
              ['elect']: 2,
              ['pass']: 1,
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
              ...getDefaultStats(votingType),
              ['elect']: 2,
              ['pass']: 1,
            },
            {
              ...getDefaultStats(votingType),
              ['elect']: 2,
              ['pass']: 1,
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
            expect(result.finalVeredict[firstCandidate.candidateId]).to.equal('not elected')
            expect(result.finalVeredict[secondCandidate.candidateId]).to.equal('not elected')
          }
        })

        it('election multiple - ended voting (all elected)', async () => {
          const [firstCandidate, secondCandidate] = candidates
          const votesStats: VotesStats = {
            [firstCandidate.candidateId]: {
              ['elect']: 2,
              ['pass']: 1,
            },
            [secondCandidate.candidateId]: {
              ['elect']: 2,
              ['pass']: 1,
            },
          }
          const retrieveVotingSpy = chai.spy(
            retrieveVotingFnEnded(generatedVotingId, votingType, 2)
          )
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
              ...getDefaultStats(votingType),
              ['elect']: 2,
              ['pass']: 1,
            },
            {
              ...getDefaultStats(votingType),
              ['elect']: 2,
              ['pass']: 1,
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
            expect(result.finalVeredict[firstCandidate.candidateId]).to.equal('elected')
            expect(result.finalVeredict[secondCandidate.candidateId]).to.equal('elected')
          }
        })
      }

      it('should retrieve voting summary - ended voting (undecided)', async () => {
        const [firstCandidate, secondCandidate] = candidates
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
            ...getDefaultStats(votingType),
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...getDefaultStats(votingType),
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
        const [firstCandidate, secondCandidate] = candidates
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
            ...generateVotingDataEnded(generatedVotingId, votingType),
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
            ...getDefaultStats(votingType),
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...getDefaultStats(votingType),
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
        const expectedStats = candidates.reduce((candidatesStats, { candidateId }) => {
          candidatesStats[candidateId] = getDefaultStats(votingType)
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
        const expectedStats = candidates.reduce((candidatesStats, { candidateId }) => {
          candidatesStats[candidateId] = getDefaultStats(votingType)
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
        candidates.forEach(({ candidateId }) => {
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
