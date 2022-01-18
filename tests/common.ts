import { VotingType } from '../src/types'

// Setup
export const nowDate = new Date()
export const yesterdayDate = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24)
export const beforeYesterdayDate = new Date(yesterdayDate.getTime() - 1000 * 60 * 60 * 24)
export const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
export const votingTypes: VotingType[] = ['election', 'judgement']
