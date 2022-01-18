import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import { VoterId, CandidateInfo } from '../src/types'

import {
  DEFAULT_CALLBACKS,
  generateVoterId,
  MAX_VOTING_DURATION,
  MIN_VOTING_DURATION,
  registerVoting,
  setCallbacks,
} from '../src/index'

import { nowDate, tomorrowDate, votingTypes } from './common'

chai.use(spies)
chai.use(chaiPromised)

// Setup
let generatedVoters: VoterId[]

function getStartedBy(): VoterId {
  const [startedBy] = generatedVoters
  return startedBy
}

function getCandidates(): CandidateInfo[] {
  const [, ...candidates] = generatedVoters
  return candidates.map((candidate) => ({ candidateId: candidate }))
}

before(async () => {
  generatedVoters = [await generateVoterId(), await generateVoterId(), await generateVoterId()]
})

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
            ...generatedVoters.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )
        const countActiveVotersSpy = chai.spy(() => Promise.resolve(generatedVoters.length))

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
            startedBy: getStartedBy(),
            candidates: getCandidates(),
            endsAt: tomorrowDate,
          },
        })
        const { voting: responseVoting } = response

        expect(persistVotingSpy).to.have.been.called.once
        expect(persistVotingSpy).to.have.been.called.with(responseVoting)
        expect(checkActiveVotersSpy).to.have.been.called.once
        expect(checkActiveVotersSpy).to.have.been.called.with(generatedVoters)
        expect(countActiveVotersSpy).to.have.been.called.once
        expect(responseVoting.votingId).to.exist
        expect(responseVoting.startsAt).to.exist
        expect(responseVoting.totalVoters).to.equal(generatedVoters.length)
      })

      it('should have all voters registered', async () => {
        const [firstCandidate, ...others] = getCandidates()
        const checkActiveVotersSpy = chai.spy(() =>
          Promise.resolve({
            [getStartedBy()]: false,
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
              startedBy: getStartedBy(),
              candidates: getCandidates(),
              endsAt: tomorrowDate,
            },
          })
        ).to.be.rejectedWith(
          `Voters ${[getStartedBy(), firstCandidate.candidateId].join(', ')} do not exist`
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
                startedBy: getStartedBy(),
                candidates: [getCandidates()[0]],
                endsAt: tomorrowDate,
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
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MIN_VOTING_DURATION - 1),
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
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MAX_VOTING_DURATION + 1),
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
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: tomorrowDate,
          endsAt: new Date(tomorrowDate.getTime() - 1),
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
          startedBy: getStartedBy(),
          candidates: [{ candidateId: getStartedBy() }, ...getCandidates()],
          endsAt: tomorrowDate,
        },
      })
    ).to.be.rejectedWith('Voting cannot be started by a candidate')
  })
})
