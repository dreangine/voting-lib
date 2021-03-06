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
  setCallbacks,
} from '../src/common'
import { retrieveVotingSummary } from '../src/voting-summary'

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
      it('partial verdict', async () => {
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
                    verdict: vote,
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
        expect(result.finalVerdict).to.not.exist
      })

      it('partial verdict - candidates without votes', async () => {
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
                    verdict: vote,
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
        expect(result.finalVerdict).to.not.exist
      })

      it('final verdict', async () => {
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
        expect(result.finalVerdict).to.exist
        if (result.finalVerdict) {
          expect(result.finalVerdict[firstCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVerdict[secondCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'not elected' : 'innocent'
          )
        }
      })

      if (votingType === 'election') {
        it('final verdict - election single (tie)', async () => {
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
          expect(result.finalVerdict).to.exist
          if (result.finalVerdict) {
            expect(result.finalVerdict[firstCandidate.candidateId]).to.equal('not elected')
            expect(result.finalVerdict[secondCandidate.candidateId]).to.equal('not elected')
          }
        })

        it('final verdict - election multiple (all elected)', async () => {
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
          expect(result.finalVerdict).to.exist
          if (result.finalVerdict) {
            expect(result.finalVerdict[firstCandidate.candidateId]).to.equal('elected')
            expect(result.finalVerdict[secondCandidate.candidateId]).to.equal('elected')
          }
        })
      }

      it('final verdict - undecided/not elected', async () => {
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
                    verdict: vote,
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
        expect(result.finalVerdict).to.exist
        if (result.finalVerdict) {
          const expectedVerdict = votingType === 'election' ? 'not elected' : 'undecided'
          expect(result.finalVerdict[firstCandidate.candidateId]).to.equal(expectedVerdict)
          expect(result.finalVerdict[secondCandidate.candidateId]).to.equal(expectedVerdict)
        }
      })

      it('final verdict - not enough votes', async () => {
        const [firstCandidate, secondCandidate] = candidates
        const votesDistribution = [
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate.candidateId, votingType === 'election' ? 'elect' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate.candidateId, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        if (votingType === 'election')
          votesDistribution.push([secondCandidate.candidateId, 'elect'])

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
                    verdict: vote,
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
            ...(votingType === 'election' ? { elect: 3 } : { guilty: 2, innocent: 1 }),
          },
          {
            ...getDefaultStats(votingType),
            ...(votingType === 'election' ? { elect: 1, pass: 2 } : { innocent: 2 }),
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVerdict).to.exist
        if (result.finalVerdict) {
          expect(result.finalVerdict[firstCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVerdict[secondCandidate.candidateId]).to.equal(
            votingType === 'election' ? 'not elected' : 'undecided'
          )
        }
      })

      it('final verdict - no votes', async () => {
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
        expect(result.finalVerdict).to.not.exist
      })

      it('final verdict - no votes', async () => {
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
        expect(result.finalVerdict).to.exist
        candidates.forEach(({ candidateId }) => {
          expect(result.finalVerdict && result.finalVerdict[candidateId]).to.equal(
            votingType === 'election' ? 'not elected' : 'undecided'
          )
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
