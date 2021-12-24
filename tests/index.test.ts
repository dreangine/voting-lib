import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'

import {
  RegisterVoteByUserIdParams,
  RegisterVoteParams,
  RegisterVotersParams,
  StartVotingParams,
  Voter,
} from '../src/types'

import { registerVote, registerVoteByUserId, registerVoters, startVoting } from '../src/index'

chai.use(spies)

describe('Add voters', () => {
  it('should add voters', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVotersParams: RegisterVotersParams = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
    }
    const result = await registerVoters(registerVotersParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result).to.exist
    result &&
      result.forEach((voter) => {
        expect(voter.voterId).to.exist
      })
  })
  it('should add voters - omit data', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVotersParams: RegisterVotersParams = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
      omitReturnedData: true,
    }
    const result = await registerVoters(registerVotersParams)

    expect(spy).to.have.been.called.once
    expect(result).to.be.null
  })
})

describe('Start election', () => {
  it('should start an election', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const startVotingParams: StartVotingParams = {
      persistVoting: spy,
      votingParams: {
        votingDescriptionId: 'VD1ASDF',
        startedBy: 'V1ASDF',
        targetedAt: ['V1ASDF', 'V2ASDF'],
        endsAt: new Date(),
      },
    }

    const result = await startVoting(startVotingParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.votingId).to.exist
    expect(result.startedAt).to.exist
  })
})

describe('Add a vote', () => {
  it('should add a vote', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVoteParams: RegisterVoteParams = {
      persistVote: spy,
      voteParams: {
        votingId: 'V1ASDF',
        voterId: 'V1ASDF',
        vote: 'yes',
        targetId: 'V2ASDF',
      },
    }

    const result = await registerVote(registerVoteParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.voteId).to.exist
    expect(result.createdAt).to.exist
  })

  it('should add a vote - by userId', async () => {
    const spyPersist = chai.spy(() => Promise.resolve())
    const voter: Voter = { voterId: 'V1ASDF', userId: 'U1ASDF' }
    const spyRetrieve = chai.spy(() => Promise.resolve(voter))
    const registerVoteParams: RegisterVoteByUserIdParams = {
      persistVote: spyPersist,
      retrieveVoter: spyRetrieve,
      voteParams: {
        userId: 'U1ASDF',
        votingId: 'V1ASDF',
        vote: 'yes',
        targetId: 'V2ASDF',
      },
    }

    const result = await registerVoteByUserId(registerVoteParams)

    expect(spyPersist).to.have.been.called.once
    expect(spyPersist).to.have.been.called.with(result)
    expect(spyRetrieve).to.have.been.called.once
    expect(result.voterId).to.equal(voter.voterId)
    expect(result.voteId).to.exist
    expect(result.createdAt).to.exist
  })
})
