// Random guest name generator: Color-Animal-Object

const colors = [
    'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Cyan',
    'Magenta', 'Violet', 'Indigo', 'Teal', 'Lime', 'Aqua', 'Crimson', 'Gold',
    'Silver', 'Bronze', 'Coral', 'Amber', 'Jade', 'Ruby', 'Sapphire', 'Emerald'
];

const animals = [
    'Wolf', 'Tiger', 'Lion', 'Bear', 'Eagle', 'Hawk', 'Dragon', 'Phoenix',
    'Panda', 'Koala', 'Otter', 'Fox', 'Raccoon', 'Badger', 'Wombat', 'Penguin',
    'Dolphin', 'Whale', 'Shark', 'Octopus', 'Leopard', 'Panther', 'Cheetah', 'Jaguar',
    'Falcon', 'Raven', 'Crow', 'Owl', 'Parrot', 'Toucan', 'Flamingo', 'Pelican',
    'Turtle', 'Snake', 'Lizard', 'Frog', 'Toad', 'Salamander', 'Newt', 'Gecko',
    'Monkey', 'Gorilla', 'Chimpanzee', 'Orangutan', 'Gibbon', 'Lemur', 'Sloth', 'Armadillo'
];

const objects = [
    'Sword', 'Shield', 'Axe', 'Hammer', 'Spear', 'Bow', 'Arrow', 'Dagger',
    'Crown', 'Throne', 'Castle', 'Tower', 'Bridge', 'Gate', 'Wall', 'Moat',
    'Book', 'Scroll', 'Quill', 'Ink', 'Map', 'Compass', 'Telescope', 'Microscope',
    'Coin', 'Gem', 'Diamond', 'Pearl', 'Crystal', 'Orb', 'Staff', 'Wand',
    'Key', 'Lock', 'Chain', 'Rope', 'Net', 'Trap', 'Cage', 'Box',
    'Star', 'Moon', 'Sun', 'Cloud', 'Storm', 'Rain', 'Snow', 'Ice',
    'Fire', 'Flame', 'Ember', 'Spark', 'Ash', 'Smoke', 'Mist', 'Fog',
    'Mountain', 'Hill', 'Valley', 'River', 'Lake', 'Ocean', 'Sea', 'Beach'
];

function generateGuestName() {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const object = objects[Math.floor(Math.random() * objects.length)];

    return `${color}-${animal}-${object}`;
}

module.exports = { generateGuestName };
