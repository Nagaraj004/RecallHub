import base64
import json
import logging
import os
import struct
import time
from urllib.parse import urlparse
import urllib.request
import urllib.error

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

logger = logging.getLogger("recallhub.webpush")


def b64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(s: str) -> bytes:
    """Decode base64url string with flexible padding."""
    s = s.strip()
    padding = len(s) % 4
    if padding == 2:
        s += "=="
    elif padding == 3:
        s += "="
    elif padding == 1:
        s += "==="
    return base64.urlsafe_b64decode(s.encode("ascii"))


def generate_vapid_key_pair() -> tuple[str, str]:
    """
    Generates a valid NIST P-256 EC VAPID keypair.
    Returns: (public_key_b64url, private_key_b64url)
    """
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_num = private_key.private_numbers().private_value
    private_bytes = private_num.to_bytes(32, byteorder="big")
    private_b64 = b64url_encode(private_bytes)

    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = b64url_encode(public_bytes)

    return public_b64, private_b64


def get_private_key_from_b64(private_b64: str) -> ec.EllipticCurvePrivateKey:
    """Reconstructs EC private key from 32-byte base64url or PEM."""
    try:
        raw_bytes = b64url_decode(private_b64)
        if len(raw_bytes) == 32:
            private_num = int.from_bytes(raw_bytes, byteorder="big")
            return ec.derive_private_key(private_num, ec.SECP256R1())
    except Exception:
        pass

    # Try PEM format
    return serialization.load_pem_private_key(private_b64.encode("utf-8"), password=None)


def get_public_key_from_b64(public_b64: str) -> ec.EllipticCurvePublicKey:
    """Reconstructs EC public key from 65-byte uncompressed point."""
    raw_bytes = b64url_decode(public_b64)
    return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw_bytes)


def create_vapid_auth_header(
    endpoint: str,
    vapid_private_key_b64: str,
    vapid_public_key_b64: str,
    vapid_claim_email: str,
) -> str:
    """
    Generates the RFC 8292 VAPID Authorization header:
    Authorization: vapid t=<jwt>, k=<vapid_public_key>
    """
    parsed = urlparse(endpoint)
    audience = f"{parsed.scheme}://{parsed.netloc}"

    header = {"typ": "JWT", "alg": "ES256"}
    now = int(time.time())
    payload = {
        "aud": audience,
        "exp": now + 86400,  # 24 hours
        "sub": vapid_claim_email if vapid_claim_email.startswith("mailto:") else f"mailto:{vapid_claim_email}",
    }

    header_b64 = b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    private_key = get_private_key_from_b64(vapid_private_key_b64)
    signature_der = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))

    # Convert DER signature to raw (r, s) 64-byte format
    r, s = serialization.load_der_parameters(
        b"\x30\x00"  # dummy to access helper or use decode_dss_signature
    ) if False else (None, None)

    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    r, s = decode_dss_signature(signature_der)
    raw_sig = r.to_bytes(32, byteorder="big") + s.to_bytes(32, byteorder="big")
    sig_b64 = b64url_encode(raw_sig)

    jwt = f"{header_b64}.{payload_b64}.{sig_b64}"
    return f"vapid t={jwt}, k={vapid_public_key_b64}"


def encrypt_payload_aes128gcm(
    receiver_p256dh_b64: str,
    receiver_auth_b64: str,
    plaintext_bytes: bytes,
) -> bytes:
    """
    Encrypts payload for Web Push using RFC 8291 (AES-128-GCM).
    """
    receiver_public_key = get_public_key_from_b64(receiver_p256dh_b64)
    receiver_pub_bytes = receiver_public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    auth_secret = b64url_decode(receiver_auth_b64)

    # 1. Ephemeral sender keypair
    sender_private_key = ec.generate_private_key(ec.SECP256R1())
    sender_public_key = sender_private_key.public_key()
    sender_pub_bytes = sender_public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    # 2. Salt (16 bytes)
    salt = os.urandom(16)

    # 3. ECDH shared secret
    ecdh_secret = sender_private_key.exchange(ec.ECDH(), receiver_public_key)

    # 4. HKDF extract & expand for IKM
    # key_info = "WebPush: info\0" + receiver_pub + sender_pub
    key_info = b"WebPush: info\x00" + receiver_pub_bytes + sender_pub_bytes
    hkdf_ikm = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=auth_secret,
        info=key_info,
    )
    ikm = hkdf_ikm.derive(ecdh_secret)

    # 5. Derive CEK (16 bytes) and Nonce (12 bytes)
    hkdf_cek = HKDF(
        algorithm=hashes.SHA256(),
        length=16,
        salt=salt,
        info=b"Content-Encoding: aes128gcm\x00",
    )
    cek = hkdf_cek.derive(ikm)

    hkdf_nonce = HKDF(
        algorithm=hashes.SHA256(),
        length=12,
        salt=salt,
        info=b"Content-Encoding: nonce\x00",
    )
    nonce = hkdf_nonce.derive(ikm)

    # 6. Pad message (\x02 delimiter at end of record per RFC 8291)
    padded_record = plaintext_bytes + b"\x02"

    # 7. AES-128-GCM encrypt
    aesgcm = AESGCM(cek)
    ciphertext_with_tag = aesgcm.encrypt(nonce, padded_record, None)

    # 8. Build AES128GCM header:
    # salt (16 bytes) + rs (4 bytes = 4096 = 0x00001000) + idlen (1 byte = 65) + sender_pub (65 bytes)
    record_size = 4096
    header = (
        salt
        + struct.pack("!I", record_size)
        + struct.pack("!B", len(sender_pub_bytes))
        + sender_pub_bytes
    )

    return header + ciphertext_with_tag


def send_web_push(
    endpoint: str,
    p256dh: str,
    auth: str,
    payload: dict,
    vapid_private_key: str,
    vapid_public_key: str,
    vapid_claim_email: str,
    ttl: int = 86400,
) -> tuple[bool, int, str]:
    """
    Sends a web push notification to a client endpoint.
    Returns (success: bool, status_code: int, response_text: str).
    """
    try:
        body_json = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        encrypted_body = encrypt_payload_aes128gcm(p256dh, auth, body_json)

        auth_header = create_vapid_auth_header(
            endpoint=endpoint,
            vapid_private_key_b64=vapid_private_key,
            vapid_public_key_b64=vapid_public_key,
            vapid_claim_email=vapid_claim_email,
        )

        headers = {
            "Authorization": auth_header,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            "TTL": str(ttl),
            "Urgency": "high",
        }

        req = urllib.request.Request(endpoint, data=encrypted_body, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            res_body = response.read().decode("utf-8", errors="ignore")
            logger.info(f"Web push delivered to {endpoint[:30]}... status={status}")
            return True, status, res_body

    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8", errors="ignore")
        logger.warning(f"Web push HTTP error {e.code} for {endpoint[:30]}...: {res_body}")
        return False, e.code, res_body
    except Exception as e:
        logger.error(f"Web push error for {endpoint[:30]}...: {e}")
        return False, 500, str(e)
