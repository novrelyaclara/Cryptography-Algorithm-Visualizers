document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let p = null;
    let g = null;
    let aSecret = null;
    let bSecret = null;
    let A_pub = null;
    let B_pub = null;

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

    // --- MATH HELPER FUNCTIONS ---

    function isPrime(num) {
        if (num < 2) return false;
        for (let i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) return false;
        }
        return true;
    }

    function modPow(base, exp, mod) {
        let res = 1n;
        let b = BigInt(base) % BigInt(mod);
        let e = BigInt(exp);
        let m = BigInt(mod);

        while (e > 0n) {
            if (e % 2n === 1n) res = (res * b) % m;
            b = (b * b) % m;
            e /= 2n;
        }
        return Number(res);
    }

    // --- STEP 1: VERIFY p AND g ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        const pVal = parseInt(document.getElementById('p').value);
        const gVal = parseInt(document.getElementById('q').value); // Input #q reused as generator g
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (isNaN(pVal) || isNaN(gVal)) {
            showError(out, 'p and g must be valid integers.');
            return;
        }
        if (!isPrime(pVal)) {
            showError(out, 'Modulus (p) must be a prime number!');
            return;
        }
        if (gVal <= 1 || gVal >= pVal) {
            showError(out, 'Generator (g) must be greater than 1 and strictly less than p.');
            return;
        }

        p = pVal;
        g = gVal;

        out.className = 'step-output';
        out.innerHTML = `✓ Public Modulus (p) = <strong>${p}</strong><br>✓ Public Generator (g) = <strong>${g}</strong>`;
        out.style.display = 'block';

        // Unlock Step 2
        step1Node.classList.remove('active');
        step1Node.classList.add('completed');
        conn1.classList.add('active');

        step2Node.classList.remove('locked');
        step2Node.classList.add('active');
        document.getElementById('e').disabled = false;   // Uses #e as Alice's secret a
        document.getElementById('msg').disabled = false; // Uses #msg as Bob's secret b
        document.getElementById('btn-step2').disabled = false;

        step2Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 2: CALCULATE PUBLIC KEYS (A & B) ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        const aVal = parseInt(document.getElementById('e').value);
        const bVal = parseInt(document.getElementById('msg').value);
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (isNaN(aVal) || isNaN(bVal)) {
            showError(out, 'Secrets a and b must be valid integers.');
            return;
        }
        if (aVal <= 1 || aVal >= p || bVal <= 1 || bVal >= p) {
            showError(out, `Secrets (a and b) should be between 1 and p-1 (${p - 1}).`);
            return;
        }

        aSecret = aVal;
        bSecret = bVal;

        // Compute Public Keys
        A_pub = modPow(g, aSecret, p);
        B_pub = modPow(g, bSecret, p);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Alice's Public Key (A) = ${A_pub}</strong><br>
            ✓ <strong>Bob's Public Key (B) = ${B_pub}</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Derivation Breakdown:</strong><br>
            • Alice: <code>A = ${g}<sup>${aSecret}</sup> mod ${p} = ${A_pub}</code><br>
            • Bob: <code>B = ${g}<sup>${bSecret}</sup> mod ${p} = ${B_pub}</code>
        `;
        out.style.display = 'block';

        // Unlock Step 3
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        document.getElementById('disp-pub').innerText = `A = ${A_pub}`;
        document.getElementById('disp-priv').innerText = `B = ${B_pub}`;
        banner.classList.remove('hidden');

        step3Node.classList.remove('locked');
        step3Node.classList.add('active');

        document.getElementById('msg-text').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: COMPUTE SHARED SECRET & ENCRYPT SENTENCE ---
    document.getElementById('btn-step3').addEventListener('click', function () {
        const messageStr = document.getElementById('msg-text').value;
        const out = document.getElementById('out-step3');
        const pipelineContainer = document.getElementById('visual-pipeline');
        const pipelineNodes = document.getElementById('pipeline-nodes');

        out.style.display = 'none';
        pipelineNodes.innerHTML = '';
        pipelineContainer.style.display = 'none';

        if (!messageStr || messageStr.length === 0) {
            showError(out, 'Please enter a sentence or message string.');
            return;
        }

        // Compute Shared Secret Key S (Alice side: B^a mod p | Bob side: A^b mod p)
        const S = modPow(B_pub, aSecret, p);

        const cipherArray = [];
        const decryptedCodes = [];

        // Encrypt message character-by-character using symmetric shift (mod 256)
        for (let i = 0; i < messageStr.length; i++) {
            const charCode = messageStr.charCodeAt(i);

            // Encryption: C = (M + S) mod 256
            const cipherChar = (charCode + S) % 256;

            // Decryption: M = (C - S + 256) mod 256
            const decryptedChar = (cipherChar - S + 256) % 256;

            cipherArray.push(cipherChar);
            decryptedCodes.push(decryptedChar);
        }

        const decryptedSentence = String.fromCharCode(...decryptedCodes);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Computed Shared Secret Key (S):</strong> <code>${S}</code><br>
            <strong>Encrypted Ciphertext (ASCII shifted by S):</strong> <code>[ ${cipherArray.join(', ')} ]</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${decryptedSentence}</strong>"
        `;
        out.style.display = 'block';

        // Render Visual Character Cards Pipeline
        for (let i = 0; i < messageStr.length; i++) {
            const char = messageStr[i] === ' ' ? '␣' : messageStr[i];
            const ascii = messageStr.charCodeAt(i);
            const cVal = cipherArray[i];
            const dVal = decryptedCodes[i];
            const decChar = String.fromCharCode(dVal) === ' ' ? '␣' : String.fromCharCode(dVal);

            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">'${char}'</div>
                <div class="char-detail">ASCII (M): <strong>${ascii}</strong></div>
                <div class="char-arrow">↓ <em>(M + ${S}) mod 256</em></div>
                <div class="char-cipher">Cipher: <strong>${cVal}</strong></div>
                <div class="char-arrow">↓ <em>(C - ${S}) mod 256</em></div>
                <div class="char-detail">Decrypted: <strong>'${decChar}'</strong></div>
            `;
            pipelineNodes.appendChild(cardNode);
        }

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
