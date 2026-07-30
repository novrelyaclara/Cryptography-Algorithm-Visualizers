# Cryptography Algorithm Visualizers

An interactive, web-based educational platform designed to visually demonstrate how core cryptographic algorithms operate step-by-step. Built to make complex cryptographic theory, key generation, and mathematical transformations intuitive and accessible.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green.style=flat-square)

---

## Overview

Understanding modern cryptography often requires navigating dense mathematical theory. **Cryptography Algorithm Visualizers** bridges the gap by providing guided visual workflows, interactive step-by-step calculations, modular arithmetic breakdowns, and character transformation pipelines.

Whether you're studying for an exam, teaching cybersecurity, or curious about how encryption secures the web, this tool lets you execute algorithms with your own custom inputs and inspect the inner workings at every stage.

---

## Features & Visualized Algorithms

The platform provides visualizers across three fundamental branches of cryptography:

### 1. Asymmetric-Key Cryptography
* **RSA (Rivest–Shamir–Adleman):** Prime selection, totient calculation $\varphi(n)$, public/private exponent key generation, modular exponentiation, and character-by-character pipeline visualization.
* **ECC (Elliptic Curve Cryptography):** Finite field parameters over $\mathbb{F}_p$, point addition, point doubling, and scalar multiplication ($k \cdot G$).
* **Diffie–Hellman Key Exchange:** Interactive key exchange protocol simulating Alice and Bob generating shared secrets over an insecure channel.

### 2. Symmetric-Key Cryptography
* **AES (Advanced Encryption Standard):** Visual representation of the round transformations (*SubBytes*, *ShiftRows*, *MixColumns*, and *AddRoundKey*).
* **DES (Data Encryption Standard):** Initial/Final Permutations, Feistel network structure, and key schedule expansion.
* **ChaCha20:** High-speed stream cipher state matrix visualization and Quarter-Round operations.

### 3. Hash Functions
* **SHA-256 (Secure Hash Algorithm 256-bit):** Message padding, chunk parsing, schedule expansion, and compression loops.
* **MD5 (Message-Digest Algorithm 5):** Legacy digest construction and state array shifts.
* **BLAKE3:** Modern tree-hash structure visualization and parallel compression operations.

---

## Getting Started

No build step, server setup, or dependencies are required. The project is built with lightweight, vanilla Web technologies.

### Prerequisites
A modern Web browser (Chrome, Firefox, Safari, Edge).

### Installation & Local Usage

**Clone the repository:**
   ```bash
   git clone [https://github.com/novrelyaclara/Cryptography-Algorithm-Visualizers.git](https://github.com/novrelyaclara/Cryptography-Algorithm-Visualizers.git)
