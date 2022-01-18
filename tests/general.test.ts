import { expect } from 'chai'
import * as chai from 'chai'
import * as chaiPromised from 'chai-as-promised'

import {
  VotingData,
  VotingType,
  VoterId,
  VotingId,
  RegisterVotingRequest,
  RegisterVoteRequest,
  UserInfo,
  CandidateInfo,
} from '../src/types'

import {
  DEFAULT_CALLBACKS,
  generateVoterId,
  generateVotingId,
  registerVote,
  registerVoteByUserId,
  registerVoters,
  registerVoting,
  retrieveVotingSummary,
  setCallbacks,
} from '../src/index'

import { tomorrowDate, yesterdayDate } from './common'

chai.use(chaiPromised)

// Setup
const users: UserInfo[] = [{ userId: 'user1' }, { userId: 'user2', alias: 'someone' }]
let generatedVoters: VoterId[]

function checkActiveVotersAllActive() {
  return Promise.resolve({
    ...generatedVoters.reduce((acc, candidate) => {
      acc[candidate] = true
      return acc
    }, {}),
  })
}

function retrieveVotingFnOngoing(votingId: VotingId, votingType: VotingType) {
  return () =>
    Promise.resolve({
      data: { ...generateOngoingVotingBase(), votingId, votingType },
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

before(async () => {
  generatedVoters = [await generateVoterId(), await generateVoterId(), await generateVoterId()]
})

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

describe('Not implemented', () => {
  it('registerVoters', async () => {
    await expect(
      registerVoters({
        users,
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
  it('registerVoting', async () => {
    const request: RegisterVotingRequest = {
      votingParams: {
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'election',
        startedBy: getStartedBy(),
        candidates: getCandidates(),
        endsAt: tomorrowDate,
      },
    }
    await expect(registerVoting(request)).to.be.rejectedWith(/Not implemented/)
    setCallbacks({
      checkActiveVoters: checkActiveVotersAllActive,
    })
    await expect(registerVoting(request)).to.be.rejectedWith(/Not implemented/)
    setCallbacks({
      countActiveVoters: () => Promise.resolve(0),
    })
    await expect(registerVoting(request)).to.be.rejectedWith(/Not implemented/)
  })
  it('registerVote', async () => {
    const votingId = await generateVotingId()
    const [candidate] = getCandidates()
    const { candidateId } = candidate
    const request: RegisterVoteRequest = {
      voteParams: {
        votingId,
        voterId: getStartedBy(),
        choices: [
          {
            candidateId,
            veredict: 'guilty',
          },
        ],
      },
    }
    await expect(registerVote(request)).to.be.rejectedWith(/Not implemented/)
    setCallbacks({
      retrieveVoting: retrieveVotingFnOngoing(votingId, 'election'),
    })
    await expect(registerVote(request)).to.be.rejectedWith(/Not implemented/)
    setCallbacks({
      hasVoted: () => Promise.resolve(false),
    })
    await expect(registerVote(request)).to.be.rejectedWith(/Not implemented/)
    await expect(
      registerVoteByUserId({
        voteParams: {
          votingId: await generateVotingId(),
          userId: 'U1ASDF',
          choices: [
            {
              candidateId,
              veredict: 'guilty',
            },
          ],
        },
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
  it('retrieveVotingSummary', async () => {
    await expect(
      retrieveVotingSummary({
        votingId: await generateVotingId(),
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
})
