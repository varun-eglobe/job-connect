function verifyGSTChecksum(gstin) {
    if (gstin.length !== 15) return false;
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let sum = 0;
    
    for (let i = 0; i < 14; i++) {
        let value = chars.indexOf(gstin[i]);
        let factor = (i % 2 === 0) ? 1 : 2;
        let product = value * factor;
        sum += Math.floor(product / 36) + (product % 36);
    }
    
    let checksum = (36 - (sum % 36)) % 36;
    let checksumChar = chars[checksum];
    
    return checksumChar === gstin[14];
}

console.log("32AAAAA0000A1Z5 is mathematically valid:", verifyGSTChecksum("32AAAAA0000A1Z5"));
console.log("29GGGGG1314R9Z6 is mathematically valid:", verifyGSTChecksum("29GGGGG1314R9Z6"));
