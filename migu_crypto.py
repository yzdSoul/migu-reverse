#!/usr/bin/env python3
"""
咪咕视频加密/解密复现脚本 v2.0

支持三种加密路径:
  1. ECB + 空密钥 (pugc.js module 24747 - www.miguvideo.com API)
  2. CBC + 时间密钥 (Base64AesCBCEncode)
  3. ECB + 硬编码密钥 "AwBwCw1l2o3g4i5n" (风控消息解密)

依赖: Node.js + crypto-js (npm install crypto-js)

用法:
  # 模式1: ECB 空密钥
  python3 migu_crypto.py enc '{"data":"hello"}'
  python3 migu_crypto.py dec 'encrypted_base64'
  python3 migu_crypto.py post '{"pageSize":10}'        # 模拟完整POST

  # 模式2: CBC 时间密钥
  python3 migu_crypto.py cbc-enc '{"data":"hello"}'
  python3 migu_crypto.py cbc-enc '{"data":"hello"}' --key "2026052020260520"
  python3 migu_crypto.py cbc-dec 'ciphertext' --key "2026052020260520"

  # 模式3: 硬编码密钥 AwBwCw1l2o3g4i5n
  python3 migu_crypto.py risk-dec 'hex_ciphertext'

  # 实用工具
  python3 migu_crypto.py gen-key     # 生成当前时间密钥
  python3 migu_crypto.py batch 'encrypted_data'  # 批量测试
  python3 migu_crypto.py install     # 安装依赖
"""

import sys
import subprocess
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NODE_SCRIPT = os.path.join(SCRIPT_DIR, 'migu_crypto_node.js')


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip())
        return
    
    action = sys.argv[1]
    
    if action == 'install':
        print("📦 Installing crypto-js...")
        subprocess.run(['npm', 'install', 'crypto-js'], cwd=SCRIPT_DIR, check=True)
        print("✅ Done! crypto-js installed in", SCRIPT_DIR)
        return
    
    if action == 'help':
        print(__doc__.strip())
        return
    
    # Build command
    cmd = ['node', NODE_SCRIPT, action]
    
    # Parse args
    extra_args = sys.argv[2:]
    cmd.extend(extra_args)
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
            cwd=SCRIPT_DIR
        )
        
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        
        if result.returncode != 0:
            if stderr:
                print(f"❌ {stderr}", file=sys.stderr)
            else:
                print(f"❌ Failed (exit code {result.returncode})", file=sys.stderr)
            sys.exit(1)
        
        # Print stdout first, then stderr (info messages)
        if stdout:
            print(stdout)
        if stderr:
            print(stderr, file=sys.stderr)
            
    except FileNotFoundError:
        print("❌ Node.js not found. Install Node.js first.", file=sys.stderr)
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("❌ Timeout", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
