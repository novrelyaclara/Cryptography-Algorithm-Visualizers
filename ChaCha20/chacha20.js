document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let originalKeyStr = "";
    let nonceStr = "";
    let initialState = new Uint32Array(16);

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

    // --- CHACHA20 HELPER PROCEDURES ---

    function stringToUint8Array(str, len) {
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = i < str.length ? str.charCodeAt(i) : 0x20; // Pad with spaces
        }
        return bytes;
    }

    function bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    }

    function wordsToHex(words) {
        return Array.from(words).map(w => w.toString(16).padStart(8, '0').toUpperCase()).join(' ');
    }

    function rotateLeft(v, c) {
        return ((v << c) | (v >>> (32 - c))) >>> 0;
    }

    function quarterRound(x, a, b, c, d) {
        x[a] = (x[a] + x[b]) >>> 0; x[d] = rotateLeft(x[d] ^ x[a], 16);
        x[c] = (x[c] + x[d]) >>> 0; x[b] = rotateLeft(x[b] ^ x[c], 12);
        x[a] = (x[a] + x[b]) >>> 0; x[d] = rotateLeft(x[d] ^ x[a], 8);
        x[c] = (x[c] + x[d]) >>> 0; x[b] = rotateLeft(x[b] ^ x[c], 7);
    }

    function setupState(keyStr, nonceStr, counter = 1) {
        let state = new Uint32Array(16);
        // Constants ("expand 32-byte k")
        state[0] = 0x61707865;
        state[1] = 0x33322064;
        state[2] = 0x79622d32;
        state[3] = 0x6b206574;

        // Key (32 bytes -> 8 words)
        let keyBytes = stringToUint8Array(keyStr, 32);
        let keyView = new DataView(keyBytes.buffer);
        for (let i = 0; i < 8; i++) {
            state[4 + i] = keyView.getUint32(i * 4, true);
        }

        // Counter (1 word)
        state[12] = counter;

        // Nonce (12 bytes -> 3 words)
        let nonceBytes = stringToUint8Array(nonceStr, 12);
        let nonceView = new DataView(nonceBytes.buffer);
        for (let i = 0; i < 3; i++) {
            state[13 + i] = nonceView.getUint32(i * 4, true);
        }

        return state;
    }

    // --- STEP 1: KEY VALIDATION ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        originalKeyStr = document.getElementById('p').value;
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (!originalKeyStr || originalKeyStr.length !== 32) {
            showError(out, 'Secret Key must be exactly 32 characters long (256 bits).');
            return;
        }

        const keyBytes = stringToUint8Array(originalKeyStr, 32);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>256-Bit Key Initialized:</strong> <code>[ ${bytesToHex(keyBytes)} ]</code><br>
            ✓ Ready for <strong>96-Bit Nonce Input</strong> in Step 2.
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

    // --- STEP 2: NONCE & STATE MATRIX SETUP ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        nonceStr = document.getElementById('e').value;
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (!nonceStr || nonceStr.length !== 12) {
            showError(out, 'Nonce String must be exactly 12 characters long (96 bits).');
            return;
        }

        initialState = setupState(originalKeyStr, nonceStr, 1);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>4x4 State Matrix Populated (16 32-bit Words):</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>State Layout (HEX):</strong><br>
            <code>
            ${initialState[0].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[1].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[2].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[3].toString(16).padStart(8,'0').toUpperCase()}<br>
            ${initialState[4].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[5].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[6].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[7].toString(16).padStart(8,'0').toUpperCase()}<br>
            ${initialState[8].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[9].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[10].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[11].toString(16).padStart(8,'0').toUpperCase()}<br>
            ${initialState[12].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[13].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[14].toString(16).padStart(8,'0').toUpperCase()} | ${initialState[15].toString(16).padStart(8,'0').toUpperCase()}
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
        document.getElementById('msg').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: EXECUTE CHACHA20 ROUNDS & XOR ---
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

        let state = new Uint32Array(initialState);
        let roundTrace = [];

        roundTrace.push({ round: 0, stage: "Initial Matrix State", data: new Uint32Array(state) });

        // Execute 10 Double Rounds (20 Rounds total)
        for (let i = 1; i <= 10; i++) {
            // Column Rounds
            quarterRound(state, 0, 4, 8, 12);
            quarterRound(state, 1, 5, 9, 13);
            quarterRound(state, 2, 6, 10, 14);
            quarterRound(state, 3, 7, 11, 15);

            // Diagonal Rounds
            quarterRound(state, 0, 5, 10, 15);
            quarterRound(state, 1, 6, 11, 12);
            quarterRound(state, 2, 7, 8, 13);
            quarterRound(state, 3, 4, 9, 14);

            roundTrace.push({ round: i, stage: `Double Round ${i} Complete`, data: new Uint32Array(state) });
        }

        // Add Initial State to Transformed State
        let keystreamState = new Uint32Array(16);
        for (let i = 0; i < 16; i++) {
            keystreamState[i] = (state[i] + initialState[i]) >>> 0;
        }

        // Convert key stream state words to byte stream
        let keystreamBytes = new Uint8Array(64);
        let ksView = new DataView(keystreamBytes.buffer);
        for (let i = 0; i < 16; i++) {
            ksView.setUint32(i * 4, keystreamState[i], true);
        }

        // Plaintext Byte Array
        let msgBytes = new TextEncoder().encode(messageStr);
        let cipherBytes = new Uint8Array(msgBytes.length);
        let decryptedBytes = new Uint8Array(msgBytes.length);

        // XOR Plaintext with Keystream
        for (let i = 0; i < msgBytes.length; i++) {
            cipherBytes[i] = msgBytes[i] ^ keystreamBytes[i % 64];
            decryptedBytes[i] = cipherBytes[i] ^ keystreamBytes[i % 64]; // XOR back to decrypt
        }

        const cipherHex = bytesToHex(cipherBytes);
        const decryptedStr = new TextDecoder().decode(decryptedBytes);

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Encrypted Ciphertext (HEX):</strong> <code>[ ${cipherHex} ]</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${decryptedStr}</strong>"
        `;
        out.style.display = 'block';

        // Render Visual Transformation Cards Pipeline
        roundTrace.forEach(item => {
            const hexRepr = item.data[0].toString(16).padStart(8,'0').toUpperCase();
            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">Round ${item.round}</div>
                <div class="char-detail">Stage: <strong>${item.stage}</strong></div>
                <div class="char-arrow">↓ <em>State Word 0</em></div>
                <div class="char-cipher"><strong>${hexRepr}</strong></div>
                <div class="char-arrow">↓ <em>Word 15</em></div>
                <div class="char-detail">HEX: <strong>${item.data[15].toString(16).padStart(8,'0').toUpperCase()}</strong></div>
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
