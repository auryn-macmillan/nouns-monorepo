// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { MerkleProof } from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import { IE3Enclave } from '../interfaces/IE3Enclave.sol';
import { IE3Voting } from '../interfaces/IE3Voting.sol';

interface IGovernorV5 {
    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external;

    function proposals(uint256 proposalId) external view returns (uint256 endBlock);
}

interface IGovernorV5Config {
    function votingPeriod() external view returns (uint256);
}

contract CrispVotingSidecar is IE3Voting {
    struct E3VotingState {
        bytes32 e3Id;
        bytes32 merkleRoot;
        Phase phase;
        uint96 forVotes;
        uint96 againstVotes;
        uint96 abstainVotes;
    }

    enum Phase {
        None,
        AcceptingInputs,
        Computing,
        Decrypted
    }

    mapping(uint256 proposalId => E3VotingState) public e3States;
    mapping(bytes32 e3Id => uint256 proposalId) public e3ToProposal;
    mapping(uint256 proposalId => mapping(address voter => bool)) public hasSubmittedE3Vote;

    address public immutable governor;
    address public immutable enclave;
    address public immutable nounsToken;
    uint256 public e3Timeout;

    event E3VoteInitialized(uint256 indexed proposalId, bytes32 indexed e3Id, bytes32 merkleRoot);
    event E3VoteCast(uint256 indexed proposalId, address indexed voter);
    event E3TallyDecrypted(uint256 indexed proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes);
    event E3VoteDecayed(uint256 indexed proposalId);

    error NotGovernor();
    error NotEnclave();
    error InvalidPhase(Phase expected, Phase actual);
    error InvalidMerkleProof();
    error E3NotInitialized(uint256 proposalId);
    error TimeoutNotReached();
    error AlreadyVoted(address voter, uint256 proposalId);

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    modifier onlyEnclave() {
        if (msg.sender != enclave) revert NotEnclave();
        _;
    }

    constructor(address _governor, address _enclave, address _nounsToken) {
        governor = _governor;
        enclave = _enclave;
        nounsToken = _nounsToken;

        try IGovernorV5Config(_governor).votingPeriod() returns (uint256 votingPeriod_) {
            e3Timeout = votingPeriod_ * 2;
        } catch {
            e3Timeout = 0;
        }
    }

    function initializeE3Vote(uint256 proposalId, bytes32 merkleRoot) external onlyGovernor {
        E3VotingState storage state = e3States[proposalId];
        if (state.phase != Phase.None) revert InvalidPhase(Phase.None, state.phase);

        bytes32 e3Id = IE3Enclave(enclave).request(IE3Enclave.RequestParams({ program: address(this), params: '' }));

        e3States[proposalId] = E3VotingState({
            e3Id: e3Id,
            merkleRoot: merkleRoot,
            phase: Phase.AcceptingInputs,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0
        });
        e3ToProposal[e3Id] = proposalId;

        emit E3VoteInitialized(proposalId, e3Id, merkleRoot);
    }

    function castE3Vote(uint256 proposalId, bytes calldata encryptedVote, bytes32[] calldata merkleProof, uint96 votingPower) external {
        E3VotingState storage state = e3States[proposalId];
        if (state.phase == Phase.None) revert E3NotInitialized(proposalId);
        if (state.phase != Phase.AcceptingInputs) revert InvalidPhase(Phase.AcceptingInputs, state.phase);
        if (hasSubmittedE3Vote[proposalId][msg.sender]) revert AlreadyVoted(msg.sender, proposalId);

        if (state.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender, votingPower));
            if (!MerkleProof.verify(merkleProof, state.merkleRoot, leaf)) revert InvalidMerkleProof();
        }

        hasSubmittedE3Vote[proposalId][msg.sender] = true;
        IE3Enclave(enclave).publishInput(state.e3Id, encryptedVote);

        emit E3VoteCast(proposalId, msg.sender);
    }

    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external onlyEnclave {
        E3VotingState storage state = e3States[proposalId];
        if (state.phase == Phase.None) revert E3NotInitialized(proposalId);
        if (state.phase == Phase.Decrypted) revert InvalidPhase(Phase.AcceptingInputs, state.phase);

        state.forVotes = forVotes;
        state.againstVotes = againstVotes;
        state.abstainVotes = abstainVotes;
        state.phase = Phase.Decrypted;

        IGovernorV5(governor).setE3Tally(proposalId, forVotes, againstVotes, abstainVotes);

        emit E3TallyDecrypted(proposalId, forVotes, againstVotes, abstainVotes);
    }

    function forceDecay(uint256 proposalId) external {
        E3VotingState storage state = e3States[proposalId];
        if (state.phase == Phase.None) revert E3NotInitialized(proposalId);
        if (state.phase == Phase.Decrypted) revert InvalidPhase(Phase.AcceptingInputs, state.phase);

        uint256 proposalEndBlock = IGovernorV5(governor).proposals(proposalId);
        if (block.number <= proposalEndBlock + e3Timeout) revert TimeoutNotReached();

        state.forVotes = 0;
        state.againstVotes = 0;
        state.abstainVotes = 0;
        state.phase = Phase.Decrypted;

        IGovernorV5(governor).setE3Tally(proposalId, 0, 0, 0);

        emit E3VoteDecayed(proposalId);
    }

    function isE3Proposal(uint256 proposalId) external view returns (bool) {
        return e3States[proposalId].phase != Phase.None;
    }

    function validate(bytes32, bytes calldata) external pure returns (bytes memory) {
        return '';
    }

    function publishInput(bytes32, bytes calldata data) external pure returns (bytes memory) {
        return data;
    }

    function verify(bytes32, bytes calldata data) external pure returns (bool) {
        return data.length > 0;
    }
}
