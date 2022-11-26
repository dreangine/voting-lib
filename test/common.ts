import * as fs from 'fs'
import { isCandidateBasedVotingType } from '../src/common'
import {
  CandidateBasedVoting,
  CandidateInfo,
  UserInfo,
  Voter,
  VoterId,
  VotingData,
  VotingId,
  VotingType,
} from '../src/types'
import { Scenario } from './types'

// Setup
export const nowDate = new Date()
export const yesterdayDate = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24)
export const beforeYesterdayDate = new Date(yesterdayDate.getTime() - 1000 * 60 * 60 * 24)
export const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
export const votingTypes: VotingType[] = ['election', 'judgment', 'option']
export const startedBy: Voter = {
  voterId: 'voter-123456',
  userId: 'user-123456',
  alias: 'John Doe',
  status: 'active',
}
export const candidates: CandidateInfo[] = getVoters().map(({ voterId, alias }) => ({
  candidateId: voterId,
  alias,
}))
export const totalVoters: number = candidates.length + 1
export const candidatesId: VoterId[] = candidates.map(({ candidateId }) => candidateId)
export const allVotersIds: VoterId[] = [startedBy.voterId, ...candidatesId]

function dateReviver(key: string, value: unknown): unknown {
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)) {
    return new Date(value)
  }
  return value
}

export function getVoters(): Voter[] {
  return JSON.parse(fs.readFileSync('test/data/voters.json', 'utf8'))
}

export function getCandidates(): CandidateInfo[] {
  return getVoters().map(({ voterId, alias }) => ({
    candidateId: voterId,
    alias,
  }))
}

export function getUsers(): UserInfo[] {
  return JSON.parse(fs.readFileSync('test/data/users.json', 'utf8'))
}

export function getScenarios(votingType: VotingType): Scenario[] {
  return fs.readdirSync(`test/data/scenarios/${votingType}`).map((file) => {
    const scenarioData: Scenario = JSON.parse(
      fs.readFileSync(`test/data/scenarios/${votingType}/${file}`, 'utf8'),
      dateReviver
    )
    scenarioData.description = `${scenarioData.description} >> ${file}`
    return scenarioData
  })
}

function generateVotingBase(): Pick<VotingData, 'votingDescription' | 'startedBy' | 'totalVoters'> {
  return {
    votingDescription: {
      'en-US': 'Test voting',
    },
    startedBy: startedBy.voterId,
    totalVoters: candidates.length + 1,
  }
}
function generateCandidateBasedVotingBase(): Pick<
  CandidateBasedVoting,
  'votingDescription' | 'startedBy' | 'candidates' | 'totalVoters'
> {
  return {
    votingDescription: {
      'en-US': 'Test voting',
    },
    startedBy: startedBy.voterId,
    candidates,
    totalVoters: candidates.length + 1,
  }
}

export function generateVotingDataOngoing(votingId: VotingId, votingType: VotingType): VotingData {
  return {
    ...(isCandidateBasedVotingType(votingType)
      ? generateCandidateBasedVotingBase()
      : generateVotingBase()),
    startsAt: yesterdayDate,
    endsAt: tomorrowDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
    votingId,
    votingType,
    ...(votingType === 'election' ? { onlyOneSelected: true } : { evidences: [] }),
  }
}

export function generateVotingDataEnded(
  votingId: VotingId,
  votingType: VotingType,
  onlyOneSelected = false
): VotingData {
  return {
    ...(isCandidateBasedVotingType(votingType)
      ? generateCandidateBasedVotingBase()
      : generateVotingBase()),
    startsAt: beforeYesterdayDate,
    endsAt: yesterdayDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
    votingId,
    votingType,
    ...(votingType === 'election' ? { onlyOneSelected } : { evidences: [] }),
  }
}
