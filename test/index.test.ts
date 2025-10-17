import { expect } from 'chai'
import * as chai from 'chai'
import * as chaiPromised from 'chai-as-promised'

import { Callbacks, RegisterVotingRequest, RegisterVoteRequest, UserInfo } from '../src/types'

import { DEFAULT_CALLBACKS, generateVotingId } from '../src/common'
import {
  checkCallbacks,
  OPTIONS,
  registerVote,
  registerVoteByUserId,
  registerVoters,
  registerVoting,
  retrieveVotingSummary,
  setCallbacks,
} from '../src/index'

import {
  allVotersIds,
  candidates,
  generateVotingDataOngoing,
  startedBy,
  tomorrowDate,
} from './common'

chai.use(chaiPromised)

// Setup
const users: UserInfo[] = [{ userId: 'user1' }, { userId: 'user2', alias: 'someone' }]
OPTIONS.minVotingDuration = 1000 * 60 * 60 * 12 // 12 hours

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

const genericFn = (): Promise<never> => {
  throw new Error('Generic error')
}
const errorTests: [string, Partial<Callbacks>][] = [
  ['Not implemented', DEFAULT_CALLBACKS],
  [
    'Thrown error',
    {
      persistVoting: genericFn,
      persistVoters: genericFn,
      persistVote: genericFn,
      retrieveVoting: genericFn,
      retrieveVoter: genericFn,
      retrieveVotes: genericFn,
      checkActiveVoters: genericFn,
      countActiveVoters: genericFn,
      hasVoted: genericFn,
    },
  ],
]

describe('Check callbacks', () => {
  it('no callback implemented', () => {
    expect(checkCallbacks()).to.eventually.deep.equal({
      persistVoting: false,
      persistVoters: false,
      persistVote: false,
      retrieveVoting: false,
      retrieveVoter: false,
      retrieveVotes: false,
      checkActiveVoters: false,
      countActiveVoters: false,
      hasVoted: false,
    })
  })
})

describe('Common errors', () => {
  errorTests.forEach(([errorType, callbacks]) => {
    describe(`${errorType}`, () => {
      beforeEach(async () => {
        setCallbacks(callbacks)
      })
      it('registerVoters', async () => {
        await expect(
          registerVoters({
            users,
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
      it('registerVoting', async () => {
        const request: RegisterVotingRequest = {
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType: 'election',
            startedBy: startedBy.voterId,
            candidates,
            endsAt: tomorrowDate,
            onlyOneSelected: true,
          },
        }
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          checkActiveVoters: () =>
            Promise.resolve({
              ...allVotersIds.reduce((acc, candidate) => {
                acc[candidate] = true
                return acc
              }, {} as Record<string, boolean>),
            }),
        })
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          countActiveVoters: () => Promise.resolve(0),
        })
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
      })
      it('registerVote', async () => {
        const votingId = generateVotingId()
        const [candidate] = candidates
        const { candidateId } = candidate
        const request: RegisterVoteRequest = {
          voteParams: {
            votingId,
            voterId: startedBy.voterId,
            choices: [
              {
                candidateId,
                verdict: 'guilty',
              },
            ],
          },
        }
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          retrieveVoting: () =>
            Promise.resolve({
              data: generateVotingDataOngoing(votingId, 'election'),
            }),
        })
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          hasVoted: () => Promise.resolve(false),
        })
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        await expect(
          registerVoteByUserId({
            voteParams: {
              votingId: generateVotingId(),
              userId: 'U1ASDF',
              choices: [
                {
                  candidateId,
                  verdict: 'guilty',
                },
              ],
            },
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
      it('retrieveVotingSummary', async () => {
        await expect(
          retrieveVotingSummary({
            votingId: generateVotingId(),
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
    })
  })
})
