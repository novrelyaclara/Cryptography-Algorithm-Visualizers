document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let n = null;
    let phi = null;
    let d = null;
    let eVal = null;

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

    function gcd(a, b) {
        while (b !== 0) {
            let temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    // Extended Euclidean Algorithm for Modular Inverse (d = e^-1 mod phi)
    function modInverse(e, phi) {
        let m0 = phi;
        let y = 0, x = 1;

        if (phi === 1) return 0;

        while (e > 1) {
            let q = Math.floor(e / phi);
            let t = phi;

            phi = e % phi;
            e = t;
            t = y;

            y = x - q * y;
            x = t;
        }

        if (x < 0) x += m0;
        return x;
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

    // --- STEP 1: CALCULATE n AND PHI ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        const p = parseInt(document.getElementById('p').value);
        const q = parseInt(document.getElementById('q').value);
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (isNaN(p) || isNaN(q)) {
            showError(out, 'p and q must be valid integers.');
            return;
        }
        if (!isPrime(p) || !isPrime(q)) {
            showError(out, 'Both p and q must be prime numbers!');
            return;
        }
        if (p === q) {
            showError(out, 'p and q must be distinct primes.');
            return;
        }

        n = p * q;
        phi = (p - 1) * (q - 1);

        if (n < 256) {
            out.className = 'step-output warning';
            out.innerHTML = `<strong>WARNING:</strong> Modulus (n) = ${n} is small (n &lt; 256). ASCII characters with codes ≥ ${n} cannot be encrypted without overflow/collisions. Try larger primes like p=17, q=19 (n=323).`;
        } else {
            out.className = 'step-output';
            out.innerHTML = `✓ Modulus (n) = ${p} × ${q} = <strong>${n}</strong><br>✓ Totient φ(n) = (${p}-1) × (${q}-1) = <strong>${phi}</strong>`;
        }
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

    // --- STEP 2: VERIFY e & CALCULATE d (WITH DETAILED NOTES) ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        const eInput = parseInt(document.getElementById('e').value);
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (isNaN(eInput)) {
            showError(out, 'Invalid public exponent input.');
            return;
        }
        if (eInput <= 1 || eInput >= phi) {
            showError(out, `e must be strictly between 1 and φ(n) which is ${phi}.`);
            return;
        }
        if (gcd(eInput, phi) !== 1) {
            showError(out, `e (${eInput}) and φ(n) (${phi}) are not coprime! gcd(${eInput}, ${phi}) = ${gcd(eInput, phi)}.`);
            return;
        }

        d = modInverse(eInput, phi);
        eVal = eInput;

        // Mathematical verification: (d * e) % phi === 1
        const verifyVal = (d * eVal) % phi;
        const kFactor = Math.floor((d * eVal) / phi);

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Private Exponent (d) = ${d}</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Derivation Step Breakdown:</strong><br>
            • Formula: <code>(d × e) ≡ 1 (mod φ(n))</code><br>
            • Extended Euclidean Algorithm finds: <code>${d} × ${eVal} = ${d * eVal}</code><br>
            • Verification: <code>${d * eVal} mod ${phi} = ${verifyVal}</code> ${verifyVal === 1 ? '✓ (Valid)' : '❌'}<br>
            • Note: <code>${d * eVal}</code> is equal to <code>${kFactor} × ${phi} + 1</code>.
        `;
        out.style.display = 'block';

        // Mark Step 2 completed & Show Banner
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        document.getElementById('disp-pub').innerText = `(${eVal}, ${n})`;
        document.getElementById('disp-priv').innerText = `(${d}, ${n})`;
        banner.classList.remove('hidden');

        // Unlock Step 3
        step3Node.classList.remove('locked');
        step3Node.classList.add('active');
        document.getElementById('msg').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: SENTENCE ENCRYPTION & DECRYPTION ---
    document.getElementById('btn-step3').addEventListener('click', function () {
        const messageStr = document.getElementById('msg').value;
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

        const cipherArray = [];
        const decryptedCodes = [];
        let isOverflow = false;

        // Process each character
        for (let i = 0; i < messageStr.length; i++) {
            const charCode = messageStr.charCodeAt(i);

            if (charCode >= n) {
                isOverflow = true;
            }

            const cipherChar = modPow(charCode, eVal, n);
            const decryptedChar = modPow(cipherChar, d, n);

            cipherArray.push(cipherChar);
            decryptedCodes.push(decryptedChar);
        }

        if (isOverflow) {
            showError(out, `Some character ASCII codes in your sentence are ≥ n (${n}). Pick larger primes so n > character code values.`);
            return;
        }

        const decryptedSentence = String.fromCharCode(...decryptedCodes);

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Encrypted Ciphertext:</strong> <code>[ ${cipherArray.join(', ')} ]</code><br>
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
                <div class="char-arrow">↓ <em>M<sup>${eVal}</sup> mod ${n}</em></div>
                <div class="char-cipher">Cipher: <strong>${cVal}</strong></div>
                <div class="char-arrow">↓ <em>C<sup>${d}</sup> mod ${n}</em></div>
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
