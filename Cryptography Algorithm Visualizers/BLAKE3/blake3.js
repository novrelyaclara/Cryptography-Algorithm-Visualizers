document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let rawMessage = null;
    let paddedMessageHex = null;
    let messageSchedule = [];

    // BLAKE3 Initialization Vector (IV) Constants
    const IV = [
        0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
        0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
    ];

    // MSG Permutation array for 7 BLAKE3 rounds
    const MSG_PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];

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

    // --- BITWISE HELPER FUNCTIONS (32-bit uint) ---

    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    function toHex32(num) {
        return (num >>> 0).toString(16).padStart(8, '0');
    }

    function stringToUtf8Bytes(str) {
        const encoder = new TextEncoder();
        return Array.from(encoder.encode(str));
    }

    // --- STEP 1: PRE-PROCESS & PAD MESSAGE ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        rawMessage = document.getElementById('msg-input').value;
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (!rawMessage || rawMessage.length === 0) {
            showError(out, 'Please enter a valid plaintext message to pad.');
            return;
        }

        const bytes = stringToUtf8Bytes(rawMessage);
        const originalBitLength = bytes.length * 8;

        // BLAKE3 pads 64-byte message blocks with zeros
        while (bytes.length % 64 !== 0 || bytes.length === 0) {
            bytes.push(0x00);
        }

        // Convert little-endian bytes for visualization
        paddedMessageHex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');

        out.className = 'step-output';
        out.innerHTML = `
            ✓ Input Plaintext: "<strong>${rawMessage}</strong>"<br>
            ✓ Plaintext Bit Length: <strong>${originalBitLength} bits</strong><br>
            ✓ Total Padded Length: <strong>${bytes.length * 8} bits</strong> (${bytes.length / 64} block(s))<br>
            ✓ <strong>Padded Plaintext Hex String:</strong> <code style="word-break: break-all;">${paddedMessageHex.substring(0, 64)}...</code>
        `;
        out.style.display = 'block';

        // Unlock Step 2
        step1Node.classList.remove('active');
        step1Node.classList.add('completed');
        conn1.classList.add('active');

        step2Node.classList.remove('locked');
        step2Node.classList.add('active');
        document.getElementById('word-index').disabled = false;
        document.getElementById('btn-step2').disabled = false;

        step2Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 2: PREPARE MESSAGE SCHEDULE ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        const wordIdxInput = parseInt(document.getElementById('word-index').value);
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (isNaN(wordIdxInput) || wordIdxInput < 0 || wordIdxInput > 63) {
            showError(out, 'Please enter a word index strictly between 0 and 63.');
            return;
        }

        // Parse base 16 words (32-bit little endian) from first block
        let m = new Array(16);
        for (let i = 0; i < 16; i++) {
            const subHex = paddedMessageHex.substring(i * 8, i * 8 + 8);
            // Reverse byte order for little endian 32-bit uint
            const b0 = parseInt(subHex.substring(0, 2), 16) || 0;
            const b1 = parseInt(subHex.substring(2, 4), 16) || 0;
            const b2 = parseInt(subHex.substring(4, 6), 16) || 0;
            const b3 = parseInt(subHex.substring(6, 8), 16) || 0;
            m[i] = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
        }

        // Construct 64 scheduled words across rounds using permutation matrix
        messageSchedule = new Array(64);
        let currentM = [...m];

        for (let r = 0; r < 4; r++) { // 4 cycles of 16 words = 64 total entries
            for (let i = 0; i < 16; i++) {
                messageSchedule[r * 16 + i] = currentM[i];
            }
            // Permute array for next round
            let nextM = new Array(16);
            for (let i = 0; i < 16; i++) {
                nextM[i] = currentM[MSG_PERMUTATION[i]];
            }
            currentM = nextM;
        }

        const selectedWordHex = toHex32(messageSchedule[wordIdxInput]);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Word Schedule W[${wordIdxInput}] = 0x${selectedWordHex}</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Expansion Step Breakdown:</strong><br>
            • Block Type: <code>${wordIdxInput < 16 ? 'Direct 32-bit slice from plaintext block' : 'Permuted via BLAKE3 msg schedule matrix'}</code><br>
            • Total Schedule Size: <code>64 words (2048 bits total expansion)</code><br>
            • Selected Word W[${wordIdxInput}] in Binary: <code>${(messageSchedule[wordIdxInput] >>> 0).toString(2).padStart(32, '0')}</code>
        `;
        out.style.display = 'block';

        // Mark Step 2 completed & Show Banner
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        document.getElementById('disp-pub').innerText = `H0: 6a09e667 | H1: bb67ae85 | H2: 3c6ef372 | H3: a54ff53a`;
        document.getElementById('disp-priv').innerText = `H4: 510e527f | H5: 9b05688c | H6: 1f83d9ab | H7: 5be0cd19`;
        banner.classList.remove('hidden');

        // Unlock Step 3
        step3Node.classList.remove('locked');
        step3Node.classList.add('active');
        document.getElementById('round-select').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: EXECUTE COMPRESSION LOOP & PRODUCE HASH ---
    document.getElementById('btn-step3').addEventListener('click', function () {
        const roundsInput = parseInt(document.getElementById('round-select').value);
        const out = document.getElementById('out-step3');
        const pipelineContainer = document.getElementById('visual-pipeline');
        const pipelineNodes = document.getElementById('pipeline-nodes');

        out.style.display = 'none';
        pipelineNodes.innerHTML = '';
        pipelineContainer.style.display = 'none';

        if (isNaN(roundsInput) || roundsInput < 1 || roundsInput > 64) {
            showError(out, 'Please enter a valid round count between 1 and 64.');
            return;
        }

        // Initialize 16-register state vector v0..v15
        let v = new Array(16);
        for (let i = 0; i < 8; i++) v[i] = IV[i];
        for (let i = 8; i < 12; i++) v[i] = IV[i - 8];
        v[12] = 0; // Counter low
        v[13] = 0; // Counter high
        v[14] = rawMessage.length; // Block length
        v[15] = 0x0B; // Flags (CHUNK_START | CHUNK_END | ROOT)

        // BLAKE3 G Quarter Round Function
        function g(v, a, b, c, d, mx, my) {
            v[a] = (v[a] + v[b] + mx) >>> 0;
            v[d] = rightRotate(v[d] ^ v[a], 16);
            v[c] = (v[c] + v[d]) >>> 0;
            v[b] = rightRotate(v[b] ^ v[c], 12);
            v[a] = (v[a] + v[b] + my) >>> 0;
            v[d] = rightRotate(v[d] ^ v[a], 8);
            v[c] = (v[c] + v[d]) >>> 0;
            v[b] = rightRotate(v[b] ^ v[c], 7);
        }

        // Execute compression rounds
        for (let i = 0; i < roundsInput; i++) {
            const offset = (i % 4) * 16;
            // Column step
            g(v, 0, 4, 8, 12, messageSchedule[offset + 0], messageSchedule[offset + 1]);
            g(v, 1, 5, 9, 13, messageSchedule[offset + 2], messageSchedule[offset + 3]);
            g(v, 2, 6, 10, 14, messageSchedule[offset + 4], messageSchedule[offset + 5]);
            g(v, 3, 7, 11, 15, messageSchedule[offset + 6], messageSchedule[offset + 7]);
            // Diagonal step
            g(v, 0, 5, 10, 15, messageSchedule[offset + 8], messageSchedule[offset + 9]);
            g(v, 1, 6, 11, 12, messageSchedule[offset + 10], messageSchedule[offset + 11]);
            g(v, 2, 7, 8, 13, messageSchedule[offset + 12], messageSchedule[offset + 13]);
            g(v, 3, 4, 9, 14, messageSchedule[offset + 14], messageSchedule[offset + 15]);
        }

        // Finalize state: v[i] ^ v[i+8] XOR with chaining values
        let finalOutputWords = new Array(8);
        for (let i = 0; i < 8; i++) {
            finalOutputWords[i] = (v[i] ^ v[i + 8]) >>> 0;
        }

        const hexDigest = finalOutputWords.map(toHex32).join('');

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Simulated Rounds Executed:</strong> <code>${roundsInput} / 64</code><br>
            <strong>Encrypted Ciphertext (BLAKE3 Hash Digest):</strong> <code style="word-break: break-all;">${hexDigest}</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${rawMessage}</strong>"<br>
        `;
        out.style.display = 'block';

        // Render Working Registers Cards (Mapping v0..v7 to match structural cards)
        const registerNames = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
        const registerState = registerNames.map((reg, idx) => ({ reg, val: v[idx] }));

        registerState.forEach(item => {
            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">Register '${item.reg}'</div>
                <div class="char-detail">Hex State: <strong>0x${toHex32(item.val)}</strong></div>
                <div class="char-arrow">↓ <em>Compression update</em></div>
                <div class="char-cipher">Cipher State Dec: <strong>${item.val >>> 0}</strong></div>
                <div class="char-arrow">↓ <em>Bitwise view</em></div>
                <div class="char-detail">MSB Hex: <strong>0x${toHex32(item.val).substring(0, 2)}</strong></div>
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
