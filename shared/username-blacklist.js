// Comprehensive username blacklist for inappropriate content
// Includes racial slurs, homophobic terms, sexual content, hate speech, and variants

const BLACKLIST = [
    // Racial slurs and variants (with common letter substitutions)
    'nigger', 'nigga', 'n1gger', 'n1gga', 'n!gger', 'n!gga', 'nigg3r', 'nigg4',
    'nig', 'nog', 'n0g', 'coon', 'c00n', 'spook', 'sp00k',
    'chink', 'ch1nk', 'gook', 'g00k', 'zipperhead', 'slant',
    'wetback', 'w3tback', 'beaner', 'b3aner', 'spic', 'sp1c',
    'kike', 'k1ke', 'heeb', 'h33b',
    'sand', 'towelhead', 'raghead', 'camel', 'jockey',
    'cracker', 'cr4cker', 'honky', 'h0nky', 'whitey', 'wh1tey',
    'paki', 'p4ki', 'curry', 'muncher',
    'abbo', 'abo', 'boong', 'coon',
    'gringo', 'gr1ngo', 'whitey',

    // Homophobic slurs and variants
    'fag', 'faggot', 'f4g', 'f4ggot', 'fgt', 'f@g', 'f@ggot',
    'dyke', 'dyk3', 'lesbo', 'l3sbo', 'carpet', 'muncher',
    'queer', 'qu33r', 'homo', 'h0mo', 'sodomite', 's0domite',
    'tranny', 'tr4nny', 'shemale', 'sh3male', 'ladyboy', 'l4dyboy',
    'fairy', 'f41ry', 'poof', 'p00f', 'queen',

    // Sexist and misogynistic terms
    'cunt', 'c0nt', 'c*nt', 'twat', 'tw4t',
    'bitch', 'b1tch', 'b!tch', 'slut', 'sl0t', 'sl*t',
    'whore', 'wh0re', 'wh*re', 'hoe', 'h0e',
    'thot', 'th0t', 'skank', 'sk4nk',

    // Sexual and explicit content
    'cock', 'c0ck', 'dick', 'd1ck', 'penis', 'p3nis',
    'pussy', 'p*ssy', 'vagina', 'v4gina', 'clit',
    'tits', 't1ts', 'boobs', 'b00bs', 'titties',
    'cum', 'c*m', 'jizz', 'j1zz', 'semen', 's3men',
    'rape', 'r4pe', 'rapist', 'r4pist', 'molest', 'm0lest',
    'pedo', 'p3do', 'pedophile', 'p3dophile', 'child', 'porn',

    // Hate symbols and extremist terms
    'nazi', 'n4zi', 'hitler', 'h1tler', 'heil', 'h3il',
    'kkk', 'swastika', 'sw4stika', '1488', '88',
    'white', 'power', 'supremacist', 'supremacy',
    'jihad', 'j1had', 'isis', '1sis', 'terrorist', 't3rrorist',

    // Offensive compound words
    'niggerfaggot', 'faggotnigger', 'cuntnigger', 'niggercunt',

    // Derogatory terms for disabilities
    'retard', 'r3tard', 'retarded', 'r3tarded', 'tard',
    'spaz', 'sp4z', 'mongoloid', 'm0ngoloid', 'autist', 'autistic',
    'cripple', 'cr1pple', 'gimp', 'g1mp',

    // Drug-related inappropriate usernames
    'meth', 'm3th', 'heroin', 'h3roin', 'cocaine', 'c0caine',
    'crackhead', 'cr4ckhead', 'junkie', 'junk13',

    // Death and violence glorification
    'kill', 'yourself', 'kys', 'suicide', 'su1cide',
    'shooter', 'sh00ter', 'killer', 'k1ller', 'murder', 'm*rder',

    // Admin/moderator impersonation
    'moderator', 'admin', 'administrator', 'staff', 'owner',
    'mod', 'discord', 'official', 'support',

    // General offensive
    'fuck', 'f*ck', 'f0ck', 'fck', 'fuk',
    'shit', 'sh1t', 'sh*t', 'ass', '4ss', '@ss',
    'damn', 'd4mn', 'bastard', 'b4stard',

    // Combinations with numbers (leet speak)
    'n199er', 'f499ot', 'c0ck', 'p3n15', 'b00b5'
];

// Function to check if a username contains blacklisted content
function isUsernameBlacklisted(username) {
    if (!username || typeof username !== 'string') {
        return false;
    }

    const lowerUsername = username.toLowerCase();

    // Check for exact matches and substrings
    for (const word of BLACKLIST) {
        if (lowerUsername.includes(word.toLowerCase())) {
            return true;
        }
    }

    // Additional pattern matching for creative spellings
    // Remove common character substitutions
    const normalized = lowerUsername
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/8/g, 'b')
        .replace(/@/g, 'a')
        .replace(/\$/g, 's')
        .replace(/!/g, 'i')
        .replace(/\*/g, '')
        .replace(/_/g, '')
        .replace(/-/g, '');

    // Check normalized version
    for (const word of BLACKLIST) {
        if (normalized.includes(word.toLowerCase())) {
            return true;
        }
    }

    return false;
}

// Function to get appropriate error message
function getBlacklistErrorMessage() {
    return 'This username contains inappropriate content and is not allowed.';
}

module.exports = {
    isUsernameBlacklisted,
    getBlacklistErrorMessage,
    BLACKLIST
};
