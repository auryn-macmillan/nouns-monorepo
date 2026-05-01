// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.23;

interface IMockE3Program {
    function validate(bytes32 e3Id, bytes calldata params) external returns (bytes memory);

    function publishInput(bytes32 e3Id, bytes calldata data) external returns (bytes memory);

    function verify(bytes32 e3Id, bytes calldata data) external returns (bool);
}

contract MockEnclave {
    enum Phase {
        None,
        Requested,
        KeyPublished,
        InputsReady,
        Computing,
        Complete
    }

    struct E3State {
        address program;
        Phase phase;
        uint256 ciphertextCount;
        bytes tally;
    }

    struct E3 {
        address requester;
        address program;
        bytes params;
        bytes committeePublicKey;
        bytes plaintextOutput;
    }

    struct RequestParams {
        address program;
        bytes params;
    }

    event E3Requested(uint256 e3Id, E3 e3, address indexed e3Program);
    event CommitteePublicKeyPublished(uint256 indexed e3Id, bytes publicKey);
    event InputPublished(uint256 indexed e3Id, bytes data, uint256 inputHash, uint256 index);
    event PlaintextOutputPublished(uint256 indexed e3Id, bytes plaintextOutput);

    mapping(uint256 e3Id => E3) public e3s;
    mapping(uint256 e3Id => E3State) public e3States;
    mapping(uint256 e3Id => bytes) public committeePublicKeys;
    mapping(uint256 e3Id => bytes[]) private _ciphertexts;

    address public owner;
    uint256 public nextE3Id;
    bool private _entered;

    error NotOwner();
    error InvalidProgram();
    error E3NotRequested(uint256 e3Id);
    error InvalidPhase(uint256 e3Id, Phase expected, Phase actual);
    error VerifyFailed(uint256 e3Id);
    error Reentrancy();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_entered) revert Reentrancy();
        _entered = true;
        _;
        _entered = false;
    }

    constructor() {
        owner = msg.sender;
    }

    function request(RequestParams calldata requestParams) external nonReentrant returns (uint256 e3Id) {
        if (requestParams.program == address(0)) revert InvalidProgram();

        e3Id = nextE3Id;
        nextE3Id = e3Id + 1;

        E3State storage state = e3States[e3Id];
        state.program = requestParams.program;
        state.phase = Phase.Requested;

        E3 storage e3 = e3s[e3Id];
        e3.requester = msg.sender;
        e3.program = requestParams.program;
        e3.params = requestParams.params;

        IMockE3Program(requestParams.program).validate(_toBytes32(e3Id), requestParams.params);

        emit E3Requested(e3Id, e3, requestParams.program);
    }

    function publishCommitteePublicKey(uint256 e3Id, bytes calldata pubkey) external onlyOwner nonReentrant {
        E3State storage state = _getRequestedState(e3Id);

        committeePublicKeys[e3Id] = pubkey;
        e3s[e3Id].committeePublicKey = pubkey;
        state.phase = Phase.KeyPublished;

        emit CommitteePublicKeyPublished(e3Id, pubkey);
    }

    function publishInput(uint256 e3Id, bytes calldata data) external nonReentrant returns (bytes memory processedData) {
        E3State storage state = e3States[e3Id];

        if (state.program == address(0)) revert E3NotRequested(e3Id);
        if (state.phase != Phase.KeyPublished && state.phase != Phase.InputsReady) {
            revert InvalidPhase(e3Id, Phase.KeyPublished, state.phase);
        }

        processedData = IMockE3Program(state.program).publishInput(_toBytes32(e3Id), data);
        _ciphertexts[e3Id].push(processedData);
        state.ciphertextCount = _ciphertexts[e3Id].length;
        state.phase = Phase.InputsReady;

        emit InputPublished(
            e3Id,
            processedData,
            uint256(keccak256(processedData)),
            state.ciphertextCount - 1
        );
    }

    function requestCompute(uint256 e3Id) external nonReentrant {
        E3State storage state = e3States[e3Id];

        if (state.program == address(0)) revert E3NotRequested(e3Id);
        if (state.phase != Phase.InputsReady) {
            revert InvalidPhase(e3Id, Phase.InputsReady, state.phase);
        }

        state.phase = Phase.Computing;
    }

    function submitDecryption(uint256 e3Id, bytes calldata data) external nonReentrant returns (bool success) {
        E3State storage state = e3States[e3Id];

        if (state.program == address(0)) revert E3NotRequested(e3Id);
        if (state.phase != Phase.Computing) {
            revert InvalidPhase(e3Id, Phase.Computing, state.phase);
        }

        success = IMockE3Program(state.program).verify(_toBytes32(e3Id), data);
        if (!success) revert VerifyFailed(e3Id);

        state.tally = data;
    }

    function publishPlaintextOutput(uint256 e3Id, bytes calldata plaintext) external onlyOwner nonReentrant {
        E3State storage state = e3States[e3Id];

        if (state.program == address(0)) revert E3NotRequested(e3Id);
        if (state.phase != Phase.Computing) {
            revert InvalidPhase(e3Id, Phase.Computing, state.phase);
        }

        state.tally = plaintext;
        state.phase = Phase.Complete;
        e3s[e3Id].plaintextOutput = plaintext;

        emit PlaintextOutputPublished(e3Id, plaintext);
    }

    function getCiphertext(uint256 e3Id, uint256 index) external view returns (bytes memory) {
        return _ciphertexts[e3Id][index];
    }

    function getCiphertextCount(uint256 e3Id) external view returns (uint256) {
        return _ciphertexts[e3Id].length;
    }

    function getE3State(
        uint256 e3Id
    ) external view returns (address program, Phase phase, uint256 ciphertextCount, bytes memory tally) {
        E3State storage state = e3States[e3Id];
        return (state.program, state.phase, state.ciphertextCount, state.tally);
    }

    function _getRequestedState(uint256 e3Id) internal view returns (E3State storage state) {
        state = e3States[e3Id];
        if (state.program == address(0)) revert E3NotRequested(e3Id);
        if (state.phase != Phase.Requested) {
            revert InvalidPhase(e3Id, Phase.Requested, state.phase);
        }
    }

    function _toBytes32(uint256 value) internal pure returns (bytes32) {
        return bytes32(value);
    }
}
