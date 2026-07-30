document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let rawMessage = null;
    let paddedMessageHex = null;
    let messageSchedule = [];

    // Initial State Hash Constants (A, B, C, D in Little-Endian representation)
    const H_INIT = [
        0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476
    ];

    // MD5 Per-Round Shift Constants
    const SHIFTS = [
        7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
        5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
        4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
        6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
    ];

    // MD5 Sine-derived Constants T[0..63]
    const K = new Array(64);
    for (let i = 0; i < 64; i++) {
        K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
    }

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

    // --- BITWISE HELPER FUNCTIONS ---

    function leftRotate(value, amount) {
        return ((value << amount) | (value >>> (32 - amount))) >>> 0;
    }

    // Convert 32-bit integer to Little-Endian Hex String
    function toHex32LE(num) {
        const bytes = [
            num & 0xff,
            (num >>> 8) & 0xff,
            (num >>> 16) & 0xff,
            (num >>> 24) & 0xff
        ];
        return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
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

        // Append 64-bit little-endian original bit length
        const lowBits = originalBitLength % 0x100000000;
        const highBits = Math.floor(originalBitLength / 0x100000000);

        bytes.push(lowBits & 0xff);
        bytes.push((lowBits >>> 8) & 0xff);
        bytes.push((lowBits >>> 16) & 0xff);
        bytes.push((lowBits >>> 24) & 0xff);

        bytes.push(highBits & 0xff);
        bytes.push((highBits >>> 8) & 0xff);
        bytes.push((highBits >>> 16) & 0xff);
        bytes.push((highBits >>> 24) & 0xff);

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

        if (isNaN(wordIdxInput) || wordIdxInput < 0 || wordIdxInput > 15) {
            showError(out, 'Please enter a word index strictly between 0 and 15.');
            return;
        }

        // Reconstruct 16 32-bit little-endian words from first 512-bit block
        messageSchedule = new Array(16);
        for (let i = 0; i < 16; i++) {
            const subHex = paddedMessageHex.substring(i * 8, i * 8 + 8);
            const b0 = parseInt(subHex.substring(0, 2), 16);
            const b1 = parseInt(subHex.substring(2, 4), 16);
            const b2 = parseInt(subHex.substring(4, 6), 16);
            const b3 = parseInt(subHex.substring(6, 8), 16);

            messageSchedule[i] = (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
        }

        const selectedWordHex = toHex32LE(messageSchedule[wordIdxInput]);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Word Schedule M[${wordIdxInput}] = 0x${selectedWordHex}</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Expansion Step Breakdown:</strong><br>
            • Block Type: <code>Direct 32-bit little-endian slice from plaintext block</code><br>
            • Total Schedule Size: <code>16 words (512 bits total)</code><br>
            • Selected Word M[${wordIdxInput}] in Binary: <code>${(messageSchedule[wordIdxInput] >>> 0).toString(2).padStart(32, '0')}</code>
        `;
        out.style.display = 'block';

        // Mark Step 2 completed & Show Banner
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        document.getElementById('disp-pub').innerText = `A: 67452301 | B: efcdab89`;
        document.getElementById('disp-priv').innerText = `C: 98badcfe | D: 10325476`;
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

        let [a, b, c, d] = H_INIT;

        // Perform MD5 compression for user-selected rounds (1 to 64)
        for (let i = 0; i < roundsInput; i++) {
            let f, g;
            if (i < 16) {
                f = (b & c) | ((~b) & d);
                g = i;
            } else if (i < 32) {
                f = (d & b) | ((~d) & c);
                g = (5 * i + 1) % 16;
            } else if (i < 48) {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b | (~d));
                g = (7 * i) % 16;
            }

            f = (f >>> 0);
            const temp = d;
            d = c;
            c = b;
            const sum = (a + f + K[i] + messageSchedule[g]) >>> 0;
            b = (b + leftRotate(sum, SHIFTS[i])) >>> 0;
            a = temp;
        }

        // Calculate state digest output (addition modulo 2^32)
        const finalA = (H_INIT[0] + a) >>> 0;
        const finalB = (H_INIT[1] + b) >>> 0;
        const finalC = (H_INIT[2] + c) >>> 0;
        const finalD = (H_INIT[3] + d) >>> 0;

        const hexDigest = [finalA, finalB, finalC, finalD]
            .map(toHex32LE).join('');

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Simulated Rounds Executed:</strong> <code>${roundsInput} / 64</code><br>
            <strong>Encrypted Ciphertext (MD5 Hash Digest):</strong> <code style="word-break: break-all;">${hexDigest}</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${rawMessage}</strong>"<br>
        `;
        out.style.display = 'block';

        // Render Working Registers Cards
        const registerState = [
            { reg: 'a', val: a },
            { reg: 'b', val: b },
            { reg: 'c', val: c },
            { reg: 'd', val: d }
        ];

        registerState.forEach(item => {
            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">Register '${item.reg}'</div>
                <div class="char-detail">Hex State: <strong>0x${toHex32LE(item.val)}</strong></div>
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
