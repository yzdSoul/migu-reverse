const CryptoJS = require('crypto-js');

// === 密钥 ===
const EMPTY_KEY = CryptoJS.enc.Utf8.parse("");
const HARDCODED_KEY = CryptoJS.enc.Utf8.parse("AwBwCw1l2o3g4i5n");

// === 模式1: AES-ECB (空密钥, 用于 pugc.js module 24747) ===
function ecbEncrypt(data, key) {
    const n = CryptoJS.enc.Utf8.parse(key);
    let t = data;
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        t = JSON.stringify(data);
    }
    const r = CryptoJS.enc.Utf8.parse(t);
    return CryptoJS.AES.encrypt(r, n, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString();
}

function ecbDecrypt(data, key) {
    const n = CryptoJS.enc.Utf8.parse(key);
    const r = CryptoJS.AES.decrypt(data, n, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return CryptoJS.enc.Utf8.stringify(r).toString();
}

// === 模式2: AES-CBC (Base64AesCBCEncode) ===
function cbcEncrypt(data, keyStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(keyStr);
    let t = data;
    if (typeof data === 'object' && data !== null) {
        t = JSON.stringify(data);
    }
    const dataBytes = CryptoJS.enc.Utf8.parse(t);
    const encrypted = CryptoJS.AES.encrypt(dataBytes, key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv
    });
    return encrypted.toString();
}

function cbcDecrypt(ciphertext, keyStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(keyStr);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: iv
    });
    return CryptoJS.enc.Utf8.stringify(decrypted).toString();
}

// === 模式3: 风险消息解密 (key "AwBwCw1l2o3g4i5n") ===
function riskDecrypt(hexInput) {
    const hexWA = CryptoJS.enc.Hex.parse(hexInput);
    const base64Str = CryptoJS.enc.Base64.stringify(hexWA);
    const decrypted = CryptoJS.AES.decrypt(base64Str, HARDCODED_KEY, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return CryptoJS.enc.Utf8.stringify(decrypted).toString();
}

// === POST 模拟 (module 24747 e.post) ===
function simulatePost(data, key) {
    const timestamp = Date.now();
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const signStr = CryptoJS.MD5(dataStr + key + timestamp).toString().toUpperCase();
    const encryptedBody = ecbEncrypt(dataStr, key);
    return {
        timestamp: timestamp,
        ensign: signStr,
        body: encryptedBody,
        headers: {
            'Content-Type': 'application/json',
            'timestamp': String(timestamp),
            'ensign': signStr,
            'requestEncryption': 'true',
            'appId': 'miguvideo',
            'terminalId': 'www'
        }
    };
}

// === 主逻辑 ===
const action = process.argv[2];
const data = process.argv[3] || '';

try {
    if (action === 'enc') {
        // ECB 空密钥加密
        let input = data;
        if (!input) {
            process.stdin.on('data', d => input += d);
            process.stdin.on('end', () => console.log(ecbEncrypt(input.trim(), '')));
        } else {
            console.log(ecbEncrypt(input, ''));
        }
    }
    else if (action === 'dec') {
        // ECB 空密钥解密
        let input = data;
        if (!input) {
            process.stdin.on('data', d => input += d);
            process.stdin.on('end', () => console.log(ecbDecrypt(input.trim(), '')));
        } else {
            console.log(ecbDecrypt(decodeURIComponent(input), ''));
        }
    }
    else if (action === 'post') {
        const jsonData = JSON.parse(data || '{}');
        console.log(JSON.stringify(simulatePost(jsonData, ''), null, 2));
    }
    else if (action === 'cbc-enc') {
        const keyIdx = process.argv.indexOf('--key');
        const keyStr = keyIdx >= 0 ? process.argv[keyIdx + 1] : 
            new Date().toISOString().replace(/[^0-9]/g,'').substring(0,16);
        console.log(cbcEncrypt(data, keyStr));
        if (keyIdx < 0) console.error('Key:', keyStr);
    }
    else if (action === 'cbc-dec') {
        const keyIdx = process.argv.indexOf('--key');
        const keyStr = keyIdx >= 0 ? process.argv[keyIdx + 1] : '';
        if (!keyStr) throw new Error('--key is required for cbc-dec');
        console.log(cbcDecrypt(data, keyStr));
    }
    else if (action === 'risk-dec') {
        console.log(riskDecrypt(data));
    }
    else if (action === 'gen-key') {
        const key = new Date().toISOString().replace(/[^0-9]/g,'').substring(0,16);
        console.log(key);
    }
    else if (action === 'batch') {
        const ciphertext = data;
        const tests = [
            { name: 'ECB empty', fn: () => ecbDecrypt(decodeURIComponent(ciphertext), '') },
            { name: 'CBC now', fn: () => {
                const now = new Date().toISOString().replace(/[^0-9]/g,'').substring(0,16);
                return cbcDecrypt(ciphertext, now);
            }},
        ];
        for (const t of tests) {
            try {
                const r = t.fn();
                console.log('[' + t.name + '] ' + (r ? (r.length > 80 ? r.substring(0,80) + '...' : r) : '(empty)'));
            } catch(e) {
                console.log('[' + t.name + '] FAILED: ' + e.message);
            }
        }
    }
    else {
        console.log(`Available commands:
  enc <data>         - ECB encrypt with empty key
  dec <data>         - ECB decrypt with empty key
  post <json>        - Simulate POST (ensign + encrypted body + headers)
  cbc-enc <data> [--key <key>]  - CBC encrypt
  cbc-dec <data> --key <key>    - CBC decrypt
  risk-dec <hex>     - Decrypt risk msg with key "AwBwCw1l2o3g4i5n"
  gen-key            - Generate current time key (16 digits)
  batch <cipher>     - Try multiple decryption methods`);
    }
} catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
}
