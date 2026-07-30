document.addEventListener('DOMContentLoaded', function () {
    // Shared State Variables
    let p = null;
    let a = null;
    let b = null;
    let G = null; // {x, y}
    let dVal = null; // Private key integer
    let Q = null; // Public key point {x, y}

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

    // --- MATH & ELLIPTIC CURVE HELPER FUNCTIONS ---

    function isPrime(num) {
        if (num < 2) return false;
        for (let i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) return false;
        }
        return true;
    }

    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    // Extended Euclidean Algorithm for Modular Inverse
    function modInverse(e, m) {
        let m0 = m;
        let y = 0, x = 1;

        if (m === 1) return 0;

        e = mod(e, m);
        while (e > 1) {
            let q = Math.floor(e / m);
            let t = m;

            m = e % m;
            e = t;
            t = y;

            y = x - q * y;
            x = t;
        }

        if (x < 0) x += m0;
        return x;
    }

    // Check if point (x, y) lies on curve y^2 = x^3 + ax + b (mod p)
    function isPointOnCurve(point, paramA, paramB, primeP) {
        if (!point) return true; // Point at infinity
        const lhs = mod(point.y * point.y, primeP);
        const rhs = mod(point.x * point.x * point.x + paramA * point.x + paramB, primeP);
        return lhs === rhs;
    }

    // Point Addition on Elliptic Curve: P1 + P2
    function pointAdd(P1, P2, paramA, primeP) {
        if (!P1) return P2;
        if (!P2) return P1;

        // P1 + (-P1) = Point at Infinity
        if (P1.x === P2.x && mod(P1.y + P2.y, primeP) === 0) {
            return null;
        }

        let lambda;
        if (P1.x === P2.x && P1.y === P2.y) {
            // Point Doubling
            if (P1.y === 0) return null;
            const num = mod(3 * P1.x * P1.x + paramA, primeP);
            const den = modInverse(2 * P1.y, primeP);
            lambda = mod(num * den, primeP);
        } else {
            // Point Addition
            const num = mod(P2.y - P1.y, primeP);
            const den = modInverse(P2.x - P1.x, primeP);
            lambda = mod(num * den, primeP);
        }

        const x3 = mod(lambda * lambda - P1.x - P2.x, primeP);
        const y3 = mod(lambda * (P1.x - x3) - P1.y, primeP);

        return { x: x3, y: y3 };
    }

    // Scalar Multiplication: k * P using Double-and-Add Algorithm
    function scalarMult(k, P, paramA, primeP) {
        let result = null; // Point at infinity
        let addend = P;

        let scalar = k;
        while (scalar > 0) {
            if (scalar & 1) {
                result = pointAdd(result, addend, paramA, primeP);
            }
            addend = pointAdd(addend, addend, paramA, primeP);
            scalar >>= 1;
        }
        return result;
    }

    // --- STEP 1: VALIDATE CURVE & BASE POINT ---
    document.getElementById('btn-step1').addEventListener('click', function () {
        p = parseInt(document.getElementById('p').value);
        a = parseInt(document.getElementById('a').value);
        b = parseInt(document.getElementById('b').value);
        const gx = parseInt(document.getElementById('gx').value);
        const gy = parseInt(document.getElementById('gy').value);
        const out = document.getElementById('out-step1');

        out.style.display = 'none';

        if (isNaN(p) || isNaN(a) || isNaN(b) || isNaN(gx) || isNaN(gy)) {
            showError(out, 'All parameters (a, b, p, Gx, Gy) must be valid integers.');
            return;
        }
        if (!isPrime(p)) {
            showError(out, 'Modulus p must be a prime number!');
            return;
        }

        // Validate Discriminant: 4a^3 + 27b^2 != 0 (mod p)
        const disc = mod(4 * a * a * a + 27 * b * b, p);
        if (disc === 0) {
            showError(out, `Invalid curve parameters: 4a³ + 27b² ≡ 0 (mod ${p}). Curve contains singular points.`);
            return;
        }

        G = { x: mod(gx, p), y: mod(gy, p) };

        if (!isPointOnCurve(G, a, b, p)) {
            showError(out, `Point G (${G.x}, ${G.y}) does NOT lie on curve y² ≡ x³ + ${a}x + ${b} (mod ${p}).`);
            return;
        }

        if (p < 256) {
            out.className = 'step-output warning';
            out.innerHTML = `<strong>WARNING:</strong> Prime field (p) = ${p} is small (p &lt; 256). ASCII codes ≥ ${p} cannot be encoded directly. Recommended defaults: p=257, a=0, b=7, G=(2, 3).`;
        } else {
            out.className = 'step-output';
            out.innerHTML = `✓ Curve <strong>y² ≡ x³ + ${a}x + ${b} (mod ${p})</strong> is valid.<br>✓ Base Point <strong>G = (${G.x}, ${G.y})</strong> lies on the curve.`;
        }
        out.style.display = 'block';

        // Unlock Step 2
        step1Node.classList.remove('active');
        step1Node.classList.add('completed');
        conn1.classList.add('active');

        step2Node.classList.remove('locked');
        step2Node.classList.add('active');
        document.getElementById('d').disabled = false;
        document.getElementById('btn-step2').disabled = false;

        step2Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 2: DERIVE PUBLIC KEY POINT Q ---
    document.getElementById('btn-step2').addEventListener('click', function () {
        const dInput = parseInt(document.getElementById('d').value);
        const out = document.getElementById('out-step2');

        out.style.display = 'none';

        if (isNaN(dInput) || dInput <= 0) {
            showError(out, 'Private key scalar d must be a positive integer.');
            return;
        }

        dVal = dInput;
        Q = scalarMult(dVal, G, a, p);

        if (!Q) {
            showError(out, 'Public Key calculation resulted in Point at Infinity. Choose a different private key d.');
            return;
        }

        out.className = 'step-output';
        out.innerHTML = `
            ✓ <strong>Public Key Point (Q) = (${Q.x}, ${Q.y})</strong><br>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">
            <strong>Derivation Step Breakdown:</strong><br>
            • Formula: <code>Q = d × G (mod p)</code><br>
            • Calculation: <code>${dVal} × (${G.x}, ${G.y})</code> on curve <code>y² ≡ x³ + ${a}x + ${b} (mod ${p})</code><br>
            • Verification: Point <code>(${Q.x}, ${Q.y})</code> ${isPointOnCurve(Q, a, b, p) ? '✓ (Valid Point on Curve)' : '❌'}
        `;
        out.style.display = 'block';

        // Mark Step 2 completed & Show Banner
        step2Node.classList.remove('active');
        step2Node.classList.add('completed');
        conn2.classList.add('active');

        document.getElementById('disp-pub').innerText = `(${Q.x}, ${Q.y})`;
        document.getElementById('disp-priv').innerText = `${dVal}`;
        banner.classList.remove('hidden');

        // Unlock Step 3
        step3Node.classList.remove('locked');
        step3Node.classList.add('active');
        document.getElementById('msg').disabled = false;
        document.getElementById('btn-step3').disabled = false;

        step3Node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // --- STEP 3: SENTENCE ENCRYPTION & DECRYPTION (ECC ELGAMAL) ---
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

        // Use fixed ephemeral key k = 3 for reproducible visual output
        const kEphemeral = 3;
        const R = scalarMult(kEphemeral, G, a, p); // Ephemeral Point R = k * G
        const S = scalarMult(kEphemeral, Q, a, p); // Shared Secret Point S = k * Q

        if (!R || !S) {
            showError(out, 'Ephemeral point calculation generated Point at Infinity. Try different curve parameters.');
            return;
        }

        // Process each character
        for (let i = 0; i < messageStr.length; i++) {
            const charCode = messageStr.charCodeAt(i);

            if (charCode >= p) {
                isOverflow = true;
            }

            // Encrypt ASCII integer M using shared secret x-coordinate (S.x):
            // C = (M * S.x) mod p
            const cVal = mod(charCode * S.x, p);

            // Decrypt using recipient private key d:
            // S_dec = d * R = d * (k * G) = k * (d * G) = k * Q = S
            const S_dec = scalarMult(dVal, R, a, p);
            const sInverse = modInverse(S_dec.x, p);

            // M = (C * S_x^-1) mod p
            const dValChar = mod(cVal * sInverse, p);

            cipherArray.push(`[R:(${R.x},${R.y}), C:${cVal}]`);
            decryptedCodes.push(dValChar);
        }

        if (isOverflow) {
            showError(out, `Some character ASCII codes in your sentence are ≥ p (${p}). Pick a larger prime p so p > character code values.`);
            return;
        }

        const decryptedSentence = String.fromCharCode(...decryptedCodes);

        out.className = 'step-output';
        out.innerHTML = `
            <strong>Ephemeral Key (k):</strong> <code>${kEphemeral}</code> | <strong>Shared Point (S = k × Q):</strong> <code>(${S.x}, ${S.y})</code><br>
            <strong>Encrypted Ciphertext Points:</strong><br><code style="font-size:0.85rem;">${cipherArray.join(', ')}</code><br>
            <strong>Decrypted Plaintext:</strong> "<strong>${decryptedSentence}</strong>"
        `;
        out.style.display = 'block';

        // Render Visual Character Cards Pipeline
        for (let i = 0; i < messageStr.length; i++) {
            const char = messageStr[i] === ' ' ? '␣' : messageStr[i];
            const ascii = messageStr.charCodeAt(i);
            const cVal = mod(ascii * S.x, p);
            const dValChar = decryptedCodes[i];
            const decChar = String.fromCharCode(dValChar) === ' ' ? '␣' : String.fromCharCode(dValChar);

            const cardNode = document.createElement('div');
            cardNode.className = 'char-card';
            cardNode.innerHTML = `
                <div class="char-header">'${char}'</div>
                <div class="char-detail">ASCII (M): <strong>${ascii}</strong></div>
                <div class="char-arrow">↓ <em>(M × S.x) mod ${p}</em></div>
                <div class="char-cipher">Cipher: <strong>${cVal}</strong></div>
                <div class="char-arrow">↓ <em>(C × S.x⁻¹) mod ${p}</em></div>
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
