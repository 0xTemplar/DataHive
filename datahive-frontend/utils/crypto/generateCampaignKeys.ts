/**
 * Generates an RSA key pair for campaign data encryption
 * @returns Object containing the public key as Uint8Array and the private key
 */
export async function generateCampaignKeys() {
  // Generate RSA key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Export public key to raw format
  const publicKeyBuffer = await window.crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey
  );

  // Export private key to store securely
  const privateKeyBuffer = await window.crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey
  );

  // Convert public key to Uint8Array for the contract
  const publicKeyArray = new Uint8Array(publicKeyBuffer);

  // Convert private key to base64 string for storage
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyBase64 = btoa(
    Array.from(privateKeyArray, (byte) => String.fromCharCode(byte)).join('')
  );

  return {
    publicKey: publicKeyArray,
    privateKey: privateKeyBase64,
  };
}

/**
 * Encrypts a file using AES-256-CBC and encrypts the AES key with RSA public key
 * @param file The file to encrypt
 * @param publicKey The RSA public key in spki format
 * @returns Object containing the encrypted file data and encrypted AES key
 */
export async function encryptFile(file: File, publicKeySpki: Uint8Array) {
  // Import the RSA public key
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeySpki,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  );

  // Generate a random AES-256 key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-CBC',
      length: 256,
    },
    true,
    ['encrypt']
  );

  // Generate random IV for AES-CBC
  const iv = window.crypto.getRandomValues(new Uint8Array(16));

  // Export AES key to raw format
  const aesKeyRaw = await window.crypto.subtle.exportKey('raw', aesKey);

  // Encrypt the AES key with RSA public key
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    aesKeyRaw
  );

  // Read file as ArrayBuffer
  const fileData = await file.arrayBuffer();

  // Encrypt file data with AES
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    aesKey,
    fileData
  );

  // Combine IV, encrypted AES key, and encrypted data
  const encryptedAesKeyArray = new Uint8Array(encryptedAesKey);
  const encryptedDataArray = new Uint8Array(encryptedData);

  // Format: [IV (16 bytes)][Encrypted AES Key Length (4 bytes)][Encrypted AES Key][Encrypted Data]
  const result = new Uint8Array(
    16 + 4 + encryptedAesKeyArray.length + encryptedDataArray.length
  );

  // Add IV
  result.set(iv, 0);

  // Add encrypted AES key length
  const keyLengthArray = new Uint8Array(
    new Uint32Array([encryptedAesKeyArray.length]).buffer
  );
  result.set(keyLengthArray, 16);

  // Add encrypted AES key
  result.set(encryptedAesKeyArray, 20);

  // Add encrypted data
  result.set(encryptedDataArray, 20 + encryptedAesKeyArray.length);

  return result;
}

/**
 * Decrypts a file using the RSA private key
 * @param encryptedData The encrypted data (IV + encrypted AES key + encrypted file data)
 * @param privateKeyBase64 The RSA private key in base64 format
 * @returns Decrypted file data as ArrayBuffer
 */
export async function decryptFile(
  encryptedData: Uint8Array,
  privateKeyBase64: string
) {
  // Convert private key from base64
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), (c) =>
    c.charCodeAt(0)
  );

  // Import the RSA private key
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['decrypt']
  );

  // Extract IV (first 16 bytes)
  const iv = encryptedData.slice(0, 16);

  // Extract encrypted AES key length (next 4 bytes)
  const keyLength = new Uint32Array(encryptedData.slice(16, 20).buffer)[0];

  // Extract encrypted AES key
  const encryptedAesKey = encryptedData.slice(20, 20 + keyLength);

  // Extract encrypted file data
  const encryptedFileData = encryptedData.slice(20 + keyLength);

  // Decrypt the AES key
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedAesKey
  );

  // Import the decrypted AES key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyRaw,
    {
      name: 'AES-CBC',
      length: 256,
    },
    false,
    ['decrypt']
  );

  // Decrypt the file data
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    aesKey,
    encryptedFileData
  );

  return decryptedData;
}
