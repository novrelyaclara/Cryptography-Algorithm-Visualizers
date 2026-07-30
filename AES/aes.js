document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let roundKeys = [];
    let originalKeyStr = "";
    let stateMatrix = [];

    // Elements
    const step1Node = document.getElementById('node-step1');
    const step2Node = document.getElementById('node-step2');
    const step3Node = document.getElementById('node-step3');

    const conn1 = document.getElementById('conn-1');
    const conn2 = document.getElementById('conn-2');
    const banner = document.getElementById('key-success-banner');

    // Prevent caching/form retention on refresh
    window.onbeforeunload = function () {
        window.scrollTo(0, 0);
    };

    // --- AES CORE LOOKUP TABLES & CONSTANTS ---
    const SBOX = [
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
        0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
        0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
        0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
        0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
        0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
        0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
        0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
        0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
        0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
        0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
        0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
        0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
        0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
        0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
    ];

    const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

    // --- AES HELPER PROCEDURES ---

    function stringToBytes16(str) {
        let bytes = [];
        for (let i = 0; i < 16; i++) {
            bytes.push(i < str.length ? str.charCodeAt(i) : 0x20); // Pad with spaces
        }
        return bytes;
    }

    function bytesToHex(bytes) {
        return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    }

    function keyExpansion(keyBytes) {
        let w = new Array(44);
        for (let i = 0; i < 4; i++) {
            w[i] = [keyBytes[4 * i], keyBytes[4 * i + 1], keyBytes[4 * i + 2], keyBytes[4 * i + 3]];
        }

        for (let i = 4; i < 44; i++) {
            let temp = [...w[i - 1]];
            if (i % 4 === 0) {
                // RotWord
                temp.push(temp.shift());
                // SubWord
                temp = temp.map(b => SBOX[b]);
                // Rcon
                temp[0] ^= RCON[(i / 4) - 1];
            }
            w[i] = [
                w[i - 4][0] ^ temp[0],
                w[i - 4][1] ^ temp[1],
                w[i - 4][2] ^ temp[2],
                w[i - 4][3] ^ temp[3]
            ];
        }

        let keys = [];
        for (let r = 0; r < 11; r++) {
            let rKey = [];
            for (let c = 0; c < 4; c++) {
                rKey.push(...w[r * 4 + c]);
            }
            keys.push(rKey);
        }
        return keys;
    }

    function subBytes(state) {
        return state.map(b => SBOX[b]);
    }

    function shiftRows(state) {
        let res = new Array(16);
        // Row 0: no shift
        res[0] = state[0]; res[4] = state[4]; res[8] = state[8]; res[12] = state[12];
        // Row 1: shift 1 left
        res[1] = state[5]; res[5] = state[9]; res[9] = state[13]; res[13] = state[1];
        // Row 2: shift 2 left
        res[2] = state[10]; res[6] = state[14]; res[10] = state[2]; res[14] = state[6];
        // Row 3: shift 3 left
        res[3] = state[15]; res[7] = state[3]; res[11] = state[7]; res[15] = state[11];
        return res;
    }

    function gmul(a, b) {
        let p = 0;
        for (let i = 0; i < 8; i++) {
            if ((b & 1) !== 0) p ^= a;
            let hi = (a & 0x80);
            a = (a << 1) & 0xFF;
            if (hi !== 0) a ^= 0x1b;
            b >>= 1;
        }
        return p;
    }

    function mixColumns(state) {
        let res = new Array(16);
        for (let c = 0; c < 4; c++) {
            let col = [state[c * 4], state[c * 4 + 1], state[c * 4 + 2], state[c * 4 + 3]];
            res[c * 4]     = gmul(col[0], 2) ^ gmul(col[1], 3) ^ col[2] ^ col[3];
            res[c * 4 + 1] = col[0] ^ gmul(col[1], 2) ^ gmul(col[2], 3) ^ col[3];
            res[c * 4 + 2] = col[0] ^ col[1] ^ gmul(col[2], 2) ^ gmul(col[3], 3);
            res[c * 4 + 3] = gmul(col[0], 3) ^ col[0] ^ col[1] ^ gmul(col[2], 2);
        }
        return res;
    }

    function addRoundKey(state, rKey) {
        return state.map((b, idx) => b ^ rKey[idx]);
    }

    // --- STEP 1: KEY EXPANSION ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        originalKeyStr = document.getElementById('p').value;
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (!originalKeyStr || originalKeyStr.length !== 16) {
            showError(out, 'Secret Key must be exactly 16 characters long (128 bits).');
            return;
        }

        const keyBytes = stringToBytes16(originalKeyStr);
        roundKeys = keyExpansion(keyBytes);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>128-Bit Key Initialized:</strong> <code>[ ${bytesToHex(keyBytes)} ]</code><br>
            ✓ Expanded into <strong>11 Round Keys</strong> (Round 0 to Round 10).<br>
            • <em>Initial Round Key (R0):</em> <code>[ ${bytesToHex(roundKeys[0])} ]</code><br>
            • <em>Final Round Key (R10):</em> <code>[ ${bytesToHex(roundKeys[10])} ]</code>
        `;
        out.style.display = 'block';

        // Unlock Step 2
        step1Node.classList.remove('active');
        step1Node.classList.add('completed');
        conn1.classList.add('active');

        step2Node.classList.remove('locked');
        step2Node.classList.add('active');
        document.getElementById('e').disabled = false;
        document.getElementById('btn-step2').disabled = false;

        step2Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 2: STATE MATRIX SETUP ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        const plainStr = document.getElementById('e').value;
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (!plainStr || plainStr.length !== 16) {
            showError(out, 'Plaintext Block must be exactly 16 characters long.');
            return;
        }

        stateMatrix = stringToBytes16(plainStr);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>4x4 State Matrix Populated:</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Column-Major Layout (HEX):</strong><br>
            <code>
            ${stateMatrix[0].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[4].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[8].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[12].toString(16).padStart(2,'0').toUpperCase()}<br>
            ${stateMatrix[1].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[5].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[9].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[13].toString(16).padStart(2,'0').toUpperCase()}<br>
            ${stateMatrix[2].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[6].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[10].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[14].toString(16).padStart(2,'0').toUpperCase()}<br>
            ${stateMatrix[3].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[7].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[11].toString(16).padStart(2,'0').toUpperCase()} | ${stateMatrix[15].toString(16).padStart(2,'0').toUpperCase()}
            </code>
        `;
        out.style.display = 'block';

        // Mark Step 2 completed & Show Banner
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        banner.classList.remove('hidden');

        // Unlock Step 3
        step3Node.classList.remove('locked');
        step3Node.classList.add('active');
        document.getElementById('msg').value = plainStr;
        document.getElementById('msg').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: EXECUTE TRANSFORMATION ROUNDS ---
    document.getElementById('btn-step3').addEventListener('click', function () {
        const messageStr = document.getElementById('msg').value;
        const out = document.getElementById('out-step3');
        const pipelineContainer = document.getElementById('visual-pipeline');
        const pipelineNodes = document.getElementById('pipeline-nodes');

        out.style.display = 'none';
        pipelineNodes.innerHTML = '';
        pipelineContainer.style.display = 'none';

        if (!messageStr) {
            showError(out, 'Please enter a valid message block.');
            return;
        }

        let currState = stringToBytes16(messageStr);
        let roundTrace = [];

        // --- ROUND 0 ---
        currState = addRoundKey(currState, roundKeys[0]);
        roundTrace.push({ round: 0, stage: "Initial AddRoundKey", data: [...currState] });

        // --- ROUNDS 1 TO 9 ---
        for (let r = 1; r <= 9; r++) {
            currState = subBytes(currState);
            currState = shiftRows(currState);
            currState = mixColumns(currState);
            currState = addRoundKey(currState, roundKeys[r]);
            roundTrace.push({ round: r, stage: `Round ${r} Complete`, data: [...currState] });
        }

        // --- ROUND 10 (FINAL) ---
        currState = subBytes(currState);
        currState = shiftRows(currState);
        currState = addRoundKey(currState, roundKeys[10]);
        roundTrace.push({ round: 10, stage: "Final Round 10", data: [...currState] });

        const cipherHex = bytesToHex(currState);

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Encrypted Ciphertext (HEX):</strong> <code>[ ${cipherHex} ]</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${messageStr.padEnd(16, ' ')}</strong>"
        `;
        out.style.display = 'block';

        // Render Visual Transformation Cards Pipeline
        roundTrace.forEach(item => {
            const hexRepr = bytesToHex(item.data.slice(0, 4));
            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">Round ${item.round}</div>
                <div class="char-detail">Stage: <strong>${item.stage}</strong></div>
                <div class="char-arrow">↓ <em>State Byte 0..3</em></div>
                <div class="char-cipher"><strong>${hexRepr}</strong></div>
                <div class="char-arrow">↓ <em>Full Block</em></div>
                <div class="char-detail">HEX: <strong>${item.data[0].toString(16).padStart(2,'0').toUpperCase()}...${item.data[15].toString(16).padStart(2,'0').toUpperCase()}</strong></div>
            `;
            pipelineNodes.appendChild(cardNode);
        });

        pipelineContainer.style.display = 'block';
        step3Node.classList.add('completed');
    });

    function showError(element, msg) {
        element.className = 'step-output error';
        element.innerText = `ERROR: ${msg}`;
        element.style.display = 'block';
    }

    document.getElementById('reset-btn').addEventListener('click', function () {
        window.location.reload();
    });
});
