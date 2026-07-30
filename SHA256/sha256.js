document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let rawMessage = null;
    let paddedMessageHex = null;
    let messageSchedule = [];

    // Initial Hash Constants (H0 to H7)
    const H_INIT = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

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

        // Append 0x80 (bit 1 followed by 0s)
        bytes.push(0x80);

        // Pad with zeros until length in bytes ≡ 56 mod 64
        while ((bytes.length % 64) !== 56) {
            bytes.push(0x00);
        }

        // Append 64-bit big-endian original bit length
        const highBits = Math.floor(originalBitLength / 0x100000000);
        const lowBits = originalBitLength % 0x100000000;

        bytes.push((highBits >>> 24) & 0xff);
        bytes.push((highBits >>> 16) & 0xff);
        bytes.push((highBits >>> 8) & 0xff);
        bytes.push(highBits & 0xff);

        bytes.push((lowBits >>> 24) & 0xff);
        bytes.push((lowBits >>> 16) & 0xff);
        bytes.push((lowBits >>> 8) & 0xff);
        bytes.push(lowBits & 0xff);

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

        // Reconstruct 16 32-bit words from first 512-bit block
        messageSchedule = new Array(64);
        for (let i = 0; i < 16; i++) {
            const subHex = paddedMessageHex.substring(i * 8, i * 8 + 8);
            messageSchedule[i] = parseInt(subHex, 16) >>> 0;
        }

        // Expand words 16 to 63
        for (let i = 16; i < 64; i++) {
            const w15 = messageSchedule[i - 15];
            const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);

            const w2 = messageSchedule[i - 2];
            const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);

            messageSchedule[i] = (messageSchedule[i - 16] + s0 + messageSchedule[i - 7] + s1) >>> 0;
        }

        const selectedWordHex = toHex32(messageSchedule[wordIdxInput]);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Word Schedule W[${wordIdxInput}] = 0x${selectedWordHex}</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Expansion Step Breakdown:</strong><br>
            • Block Type: <code>${wordIdxInput < 16 ? 'Direct 32-bit slice from plaintext block' : 'Calculated via bitwise σ0 + σ1 functions'}</code><br>
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

        // SHA-256 Round Constants K[0..63]
        const K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        let [a, b, c, d, e, f, g, h] = H_INIT;

        // Perform compression for user-selected rounds
        for (let i = 0; i < roundsInput; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ ((~e) & g);
            const temp1 = (h + S1 + ch + K[i] + messageSchedule[i]) >>> 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        // Calculate state digest output
        const finalH0 = (H_INIT[0] + a) >>> 0;
        const finalH1 = (H_INIT[1] + b) >>> 0;
        const finalH2 = (H_INIT[2] + c) >>> 0;
        const finalH3 = (H_INIT[3] + d) >>> 0;
        const finalH4 = (H_INIT[4] + e) >>> 0;
        const finalH5 = (H_INIT[5] + f) >>> 0;
        const finalH6 = (H_INIT[6] + g) >>> 0;
        const finalH7 = (H_INIT[7] + h) >>> 0;

        const hexDigest = [finalH0, finalH1, finalH2, finalH3, finalH4, finalH5, finalH6, finalH7]
            .map(toHex32).join('');

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Simulated Rounds Executed:</strong> <code>${roundsInput} / 64</code><br>
            <strong>Encrypted Ciphertext (SHA-256 Hash Digest):</strong> <code style="word-break: break-all;">${hexDigest}</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${rawMessage}</strong>"<br>
        `;
        out.style.display = 'block';

        // Render Working Registers Cards
        const registerState = [
            { reg: 'a', val: a }, { reg: 'b', val: b },
            { reg: 'c', val: c }, { reg: 'd', val: d },
            { reg: 'e', val: e }, { reg: 'f', val: f },
            { reg: 'g', val: g }, { reg: 'h', val: h }
        ];

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
