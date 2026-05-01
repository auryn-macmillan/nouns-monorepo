// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

import { IE3Program } from '../interfaces/IE3Program.sol';

/// @notice Minimal interface for calling back into CrispVotingSidecar after decryption.
interface ICrispVotingSidecar {
    function setE3Tally(uint256 proposalId, uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) external;
}

/// @title NounsCrispProgram
/// @notice E3 Program contract registered with the Interfold Enclave for Nouns secret-ballot voting.
///         The Enclave calls `validate` when an E3 is requested, `publishInput` for each encrypted vote,
///         and `verify` when the FHE computation result is ready.  On `verify`, the decrypted tally is
///         forwarded to the CrispVotingSidecar which in turn calls `setE3Tally` on the Governor.
contract NounsCrispProgram is IE3Program {
    // ─── Constants ────────────────────────────────────────────────────────────

    bytes32 public constant ENCRYPTION_SCHEME_ID = keccak256('fhe.rs:BFV');

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The CrispVotingSidecar that manages per-proposal E3 state.
    address public immutable sidecar;

    /// @notice The Interfold Enclave contract — only it may call publishInput / verify.
    address public immutable enclave;

    /// @notice Maps e3Id → proposalId, populated during validate().
    mapping(bytes32 e3Id => uint256 proposalId) public e3ToProposal;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TallyVerified(bytes32 indexed e3Id, uint256 indexed proposalId);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotEnclave();
    error UnknownE3(bytes32 e3Id);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyEnclave() {
        if (msg.sender != enclave) revert NotEnclave();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _sidecar, address _enclave) {
        sidecar = _sidecar;
        enclave = _enclave;
    }

    // ─── IE3Program ───────────────────────────────────────────────────────────

    /// @notice Called by the Enclave when an E3 computation is requested.
    ///         Params encode (uint256 proposalId, bytes32 merkleRoot) — the sidecar already
    ///         stores the merkle root, so we only need proposalId here to build the mapping.
    /// @return The encryption scheme identifier expected by the Enclave.
    function validate(bytes32 e3Id, bytes calldata params) external onlyEnclave returns (bytes memory) {
        (uint256 proposalId, ) = abi.decode(params, (uint256, bytes32));
        e3ToProposal[e3Id] = proposalId;
        return abi.encode(ENCRYPTION_SCHEME_ID);
    }

    /// @notice Called by the Enclave for each encrypted vote input.
    ///         Pass-through — actual FHE accumulation happens off-chain inside the Enclave network.
    function publishInput(bytes32 e3Id, bytes calldata data) external view onlyEnclave returns (bytes memory) {
        if (e3ToProposal[e3Id] == 0 && e3Id != bytes32(0)) revert UnknownE3(e3Id);
        return data;
    }

    /// @notice Called by the Enclave once the FHE computation is complete and the plaintext is ready.
    ///         Decodes the tally and forwards it to the CrispVotingSidecar.
    /// @param data ABI-encoded (uint96 forVotes, uint96 againstVotes, uint96 abstainVotes)
    function verify(bytes32 e3Id, bytes calldata data) external onlyEnclave returns (bool) {
        uint256 proposalId = e3ToProposal[e3Id];
        if (proposalId == 0 && e3Id != bytes32(0)) revert UnknownE3(e3Id);

        (uint96 forVotes, uint96 againstVotes, uint96 abstainVotes) = abi.decode(data, (uint96, uint96, uint96));

        ICrispVotingSidecar(sidecar).setE3Tally(proposalId, forVotes, againstVotes, abstainVotes);

        emit TallyVerified(e3Id, proposalId);
        return true;
    }
}
