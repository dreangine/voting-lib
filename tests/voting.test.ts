import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  DEFAULT_CALLBACKS,
  MAX_VOTING_DURATION,
  MIN_VOTING_DURATION,
  registerVoting,
  setCallbacks,
} from '../src/index'

import {
  allVotersIds,
  candidates,
  nowDate,
  startedBy,
  tomorrowDate,
  totalVoters,
  votingTypes,
} from './common'

chai.use(spies)
chai.use(chaiPromised)

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

describe('Voting', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, async () => {
      it('should start a voting', async () => {
        const persistVotingSpy = chai.spy(() =>
          Promise.resolve({
            inserts: 1,
          })
        )
        const checkActiveVotersSpy = chai.spy(() =>
          Promise.resolve({
            ...allVotersIds.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )
        const countActiveVotersSpy = chai.spy(() => Promise.resolve(totalVoters))

        setCallbacks({
          persistVoting: persistVotingSpy,
          checkActiveVoters: checkActiveVotersSpy,
          countActiveVoters: countActiveVotersSpy,
        })

        const response = await registerVoting({
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType,
            startedBy: startedBy.voterId,
            candidates,
            endsAt: tomorrowDate,
            ...(votingType === 'election' ? { maxElectedCandidates: 1 } : { evidences: [] }),
          },
        })
        const { voting: responseVoting } = response

        expect(persistVotingSpy).to.have.been.called.once
        expect(persistVotingSpy).to.have.been.called.with(responseVoting)
        expect(checkActiveVotersSpy).to.have.been.called.once
        expect(checkActiveVotersSpy).to.have.been.called.with(allVotersIds)
        expect(countActiveVotersSpy).to.have.been.called.once
        expect(responseVoting.votingId).to.exist
        expect(responseVoting.startsAt).to.exist
        expect(responseVoting.totalVoters).to.equal(totalVoters)
      })

      it('should have all voters registered', async () => {
        const [firstCandidate, ...others] = candidates
        const checkActiveVotersSpy = chai.spy(() =>
          Promise.resolve({
            [startedBy.voterId]: false,
            [firstCandidate.candidateId]: false,
            ...others.reduce((acc, { candidateId }) => {
              acc[candidateId] = true
              return acc
            }, {}),
          })
        )

        setCallbacks({
          checkActiveVoters: checkActiveVotersSpy,
        })

        await expect(
          registerVoting({
            votingParams: {
              votingDescription: {
                'en-US': 'Test voting',
              },
              votingType,
              startedBy: startedBy.voterId,
              candidates,
              endsAt: tomorrowDate,
              ...(votingType === 'election' ? { maxElectedCandidates: 1 } : { evidences: [] }),
            },
          })
        ).to.be.rejectedWith(
          `Voters ${[startedBy.voterId, firstCandidate.candidateId].join(', ')} do not exist`
        )
        expect(checkActiveVotersSpy).to.have.been.called.once
      })

      if (votingType === 'election') {
        it('an election must have more than 1 candidate', async () => {
          await expect(
            registerVoting({
              votingParams: {
                votingDescription: {
                  'en-US': 'Test election',
                },
                votingType,
                startedBy: startedBy.voterId,
                candidates: [candidates[0]],
                endsAt: tomorrowDate,
                ...(votingType === 'election' ? { maxElectedCandidates: 1 } : { evidences: [] }),
              },
            })
          ).to.be.rejectedWith(/Election must have at least \d+ candidates/)
        })
      }
    })
  })
  it('a voting cannot be too short', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: startedBy.voterId,
          candidates,
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MIN_VOTING_DURATION - 1),
          maxElectedCandidates: 1,
        },
      })
    ).to.be.rejectedWith('Voting duration is too short')
  })

  it('a voting cannot be too long', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: startedBy.voterId,
          candidates,
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MAX_VOTING_DURATION + 1),
          maxElectedCandidates: 1,
        },
      })
    ).to.be.rejectedWith('Voting duration is too long')
  })

  it('a voting cannot end before it starts', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: startedBy.voterId,
          candidates,
          startsAt: tomorrowDate,
          endsAt: new Date(tomorrowDate.getTime() - 1),
          maxElectedCandidates: 1,
        },
      })
    ).to.be.rejectedWith(`Voting cannot end before it starts`)
  })

  it('a voting cannot be started by a candidate', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test election',
          },
          votingType: 'election',
          startedBy: startedBy.voterId,
          candidates: [{ candidateId: startedBy.voterId }, ...candidates],
          endsAt: tomorrowDate,
          maxElectedCandidates: 1,
        },
      })
    ).to.be.rejectedWith('Voting cannot be started by a candidate')
  })
})
