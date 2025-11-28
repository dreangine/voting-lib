# Voting Library - AI Coding Assistant Instructions

## Architecture Overview

This is a **dependency-free TypeScript voting library** designed for transparency and flexibility. The library implements three voting types:

- **Election**: Single-candidate selection with most votes winning
- **Judgment**: Guilty/innocent verdicts for candidates with evidence support
- **Option**: Multi-option selection from predefined choices

### Core Design Principles

1. **Storage Agnostic**: The library requires consumer-provided callback functions for all data persistence (`setCallbacks()`)
2. **User Privacy**: Uses separate `UserId` (private) and `VoterId` (public) identifiers
3. **Type Safety**: Heavy use of TypeScript discriminated unions based on `VotingType`

## Critical Patterns

### Callback-Driven Architecture

All data operations use injected callbacks defined in `src/common.ts`:

```typescript
setCallbacks({
  persistVoting,
  persistVoters,
  persistVote,
  retrieveVoting,
  retrieveVoter,
  retrieveVotes,
  checkActiveVoters,
  countActiveVoters,
  hasVoted,
})
```

**Never implement direct storage** - always work through these abstractions.

### Type System Structure

- `VotingType` drives discriminated unions throughout the codebase
- Candidate-based types: `'election' | 'judgment'` with `candidates` array
- Option-based types: `'option'` with string values
- Use type guards like `isCandidateBasedVoting()` and `isOptionBasedVoting()`

### Vote Choice Patterns

Votes use discriminated unions:

```typescript
// Candidate-based (election/judgment)
{ candidateId: VoterId, verdict: 'elect' | 'pass' | 'innocent' | 'guilty' }
// Option-based
{ value: string }
```

## Development Workflows

### Testing

- **Run tests**: `npm test` (uses Mocha with ts-node)
- **Coverage**: `npm run coverage` (uses nyc)
- **Test data**: JSON scenarios in `test/data/scenarios/{election,judgment,option}/`
- **Mock setup**: All tests use in-memory callback implementations in `test/common.ts`

### Examples & Validation

- **Run examples**: `npm run examples:election`, `examples:judgment`, `examples:option`
- Examples in `examples/` show complete callback setup patterns
- Use `examples/common.mjs` as reference for in-memory data storage

### Build & Distribution

- **Build**: `npm run build` (TypeScript to `dist/`)
- **Entry point**: `src/index.ts` exports all public APIs
- **Types**: Generated `.d.ts` files for consumers

## Configuration

### Global Options

Modify `OPTIONS` object from `src/common.ts`:

```typescript
import { OPTIONS, DURATION } from 'voting-lib'
OPTIONS.minVotingDuration = DURATION.hour * 12
OPTIONS.canVoterVoteForHimself = false
```

### Required Setup

1. Import and call `setCallbacks()` with all persistence functions
2. Configure `OPTIONS` if defaults don't suit your use case
3. Use `checkCallbacks()` to validate setup before operations

## Key File Responsibilities

- `src/types.ts`: All TypeScript definitions, discriminated unions
- `src/common.ts`: Configuration, callbacks, type guards, utilities
- `src/voting.ts`: Voting creation and validation logic
- `src/vote.ts`: Individual vote registration
- `src/voting-summary.ts`: Results calculation with partial/final states
- `src/voter.ts`: Voter registration from user data

## Testing Conventions

- Scenario-based testing with JSON fixtures
- Each voting type has comprehensive scenarios in `test/data/scenarios/`
- Tests validate both success and error paths
- Use `test/common.ts` helpers for consistent test data setup

## Common Gotchas

- **Voting timing**: All dates must be provided as `Date` objects, not strings
- **Privacy separation**: Never expose `UserId` in public APIs, always use `VoterId`
- **Callback validation**: Call `checkCallbacks()` before any operations
- **Type narrowing**: Use type guards before accessing type-specific properties
- **Vote choices validation**: Different voting types accept different verdict formats
