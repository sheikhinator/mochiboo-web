// MochiBoo content library — symptoms, phases, care cards, needs, vibes, questions.

export const SYMPTOM_GROUPS = [
  { id: 'flow', name: 'Flow', single: true, items: [
    ['spotting', '💧', 'Spotting'], ['light', '🩸', 'Light'], ['medium', '🩸🩸', 'Medium'],
    ['heavy', '🩸🩸🩸', 'Heavy'], ['clots', '🫧', 'Clots'] ] },
  { id: 'pain', name: 'Pain', items: [
    ['cramps', '🌀', 'Cramps'], ['headache', '🤕', 'Headache'], ['migraine', '⚡', 'Migraine'],
    ['backache', '🪵', 'Backache'], ['breasts', '🍑', 'Tender breasts'], ['ovupain', '🎯', 'Ovulation pain'],
    ['joints', '🦴', 'Achy joints'], ['legs', '🦵', 'Heavy legs'] ] },
  { id: 'body', name: 'Body', items: [
    ['bloating', '🎈', 'Bloating'], ['acne', '🌋', 'Acne'], ['fatigue', '😴', 'Tired'],
    ['nausea', '🤢', 'Nausea'], ['dizzy', '💫', 'Dizzy'], ['cravings', '🍫', 'Cravings'],
    ['hungry', '🍜', 'Extra hungry'], ['noappetite', '🥄', 'No appetite'], ['insomnia', '🌙', 'Can\'t sleep'],
    ['hotflash', '🔥', 'Hot flashes'], ['chills', '🥶', 'Chills'], ['constipation', '🧱', 'Constipation'],
    ['diarrhea', '🌊', 'Upset tummy'], ['swelling', '🫧', 'Puffy'], ['glowing', '✨', 'Glowing skin'],
    ['oilyhair', '💇‍♀️', 'Oily hair'] ] },
  { id: 'mood', name: 'Mood', items: [
    ['happy', '😊', 'Happy'], ['calm', '😌', 'Calm'], ['loving', '🥰', 'Loving'], ['playful', '😜', 'Playful'],
    ['energetic', '⚡', 'Energetic'], ['confident', '💅', 'Confident'], ['grateful', '🙏', 'Grateful'],
    ['sensitive', '🥺', 'Sensitive'], ['emotional', '😭', 'Emotional'], ['sad', '😢', 'Sad'],
    ['anxious', '😰', 'Anxious'], ['irritable', '😤', 'Irritable'], ['angry', '😡', 'Angry'],
    ['swings', '🎢', 'Mood swings'], ['stressed', '🤯', 'Stressed'], ['lonely', '🫥', 'Lonely'],
    ['needy', '🧸', 'Clingy'], ['bored', '😑', 'Bored'], ['unmotivated', '🫠', 'Unmotivated'] ] },
  { id: 'discharge', name: 'Discharge', single: true, items: [
    ['dry', '🏜️', 'Dry'], ['sticky', '🍯', 'Sticky'], ['creamy', '🥛', 'Creamy'],
    ['watery', '💧', 'Watery'], ['eggwhite', '🥚', 'Egg white'], ['unusual', '⚠️', 'Unusual'] ] },
  { id: 'drive', name: 'Sex drive', single: true, items: [
    ['low', '🧊', 'Low'], ['medium', '🌸', 'Medium'], ['high', '🔥', 'High'] ] },
  { id: 'intimacy', name: 'Intimacy', single: true, items: [
    ['none', '🤍', 'None'], ['protected', '🍒', 'Protected'], ['unprotected', '🍓', 'Unprotected'],
    ['cuddles', '🤗', 'Just cuddles'] ] },
  { id: 'other', name: 'Other', items: [
    ['travel', '✈️', 'Travel'], ['sick', '🤧', 'Sick'], ['stress', '📚', 'Busy day'],
    ['alcohol', '🍷', 'Drinks'], ['workout', '🏃‍♀️', 'Workout'], ['party', '🎉', 'Party'],
    ['meds', '💊', 'Painkillers'] ] },
];

export const SYMPTOM_INDEX = {};
for (const g of SYMPTOM_GROUPS) for (const [id, e, n] of g.items) SYMPTOM_INDEX[g.id + ':' + id] = { group: g.id, id, emoji: e, name: n };

export const NEGATIVE_MOODS = ['sensitive', 'emotional', 'sad', 'anxious', 'irritable', 'angry', 'swings', 'stressed', 'lonely'];

export const PHASES = {
  period: { name: 'Period', emoji: '🩸', color: '#FF5C8A',
    body: 'Your uterus is shedding its lining. Energy and iron can dip, so go gentle.',
    feel: 'Cosy, tired, a bit tender. Rest is productive right now.',
    care: ['Heat pad on the tummy', 'Iron-rich food: spinach, dates, lentils', 'Ginger or chamomile tea', 'Slow walks or stretches only', 'Early night with a comfort show'] },
  follicular: { name: 'Follicular', emoji: '🌱', color: '#7CCBA2',
    body: 'Estrogen is rising and a new egg is getting ready. Energy is coming back.',
    feel: 'Fresh, curious, social. A great time to start things.',
    care: ['Try something new', 'Plan fun dates', 'Fresh salads and protein', 'Cardio or dance feels good', 'Skin is usually calm, enjoy it'] },
  ovulation: { name: 'Ovulation', emoji: '✨', color: '#FFB547',
    body: 'An egg is released. Estrogen peaks and so does confidence.',
    feel: 'Glowy, flirty, confident and chatty.',
    care: ['Main-character day: dress up', 'Big conversations go well now', 'Stay hydrated', 'High-energy workouts', 'Remember: the most fertile days 💕'] },
  luteal: { name: 'Luteal', emoji: '🌙', color: '#A98BFF',
    body: 'Progesterone rises to prepare the body. Later in this phase PMS can show up.',
    feel: 'Calmer then more sensitive. Cravings are real and valid.',
    care: ['Complex carbs and dark chocolate', 'Magnesium: nuts, bananas, seeds', 'Less caffeine, more sleep', 'Yoga or pilates', 'Say no to extra plans'] },
};

export const AFFIRMATIONS = [
  'You are so loved, even on the messy days 💗', 'Your body is doing amazing work today.',
  'Rest is not lazy. Rest is love.', 'You are allowed to take up space.', 'Soft is strong. You are both.',
  'Somebody out there thinks you hung the moon 🌙', 'Your feelings make sense.', 'You glow different today ✨',
  'One step at a time, princess.', 'You deserve snacks and kisses.', 'Bloop believes in you 🫧',
  'Be as gentle with yourself as you are with everyone else.', 'You are someone\'s favourite notification.',
  'Today you only have to be you.', 'Your heart is the cutest thing about you.', 'Hydrate, cutie 💧',
];

export const NEEDS = [
  ['hug', '🤗', 'A hug'], ['snacks', '🍫', 'Snacks'], ['icecream', '🍦', 'Ice cream'], ['chai', '☕', 'Chai'],
  ['space', '🌙', 'Space'], ['attention', '🥺', 'Attention'], ['call', '📞', 'Call me'], ['talk', '💬', 'Talk to me'],
  ['date', '💐', 'A date'], ['cuddles', '🧸', 'Cuddles'], ['massage', '💆‍♀️', 'Massage'], ['flowers', '🌷', 'Flowers'],
  ['heatpad', '🔥', 'Heat pad'], ['meds', '💊', 'Painkillers'], ['pads', '🩹', 'Pads'], ['reassure', '💗', 'Reassure'],
];

export const NEED_REPLIES = ['On my way 🏃‍♂️', 'Done, check your door 🚪', 'Calling you now 📞', 'Sending all my love 💗', 'Give me 20 mins ⏰', 'Anything for you 🥺'];

export const VIBES = ['🍒', '🔥', '🫦', '🛁', '🕯️', '😏', '🌹', '🍓'];
export const VIBE_LEVELS = [['🧊', 'Chill'], ['🌸', 'Soft'], ['🍒', 'Flirty'], ['🔥', 'Spicy']];
export const TONIGHT_ANSWERS = [['yes', '😏', 'Yes please'], ['maybe', '🥺', 'Maybe, convince me'], ['cuddles', '🤗', 'Not tonight, cuddles instead']];

export const QUESTIONS = [
  'What was your first impression of me?', 'What is your favourite memory of us?', 'Where should our dream trip be?',
  'What tiny thing do I do that you love?', 'What song reminds you of us?', 'What is one thing you want us to try together?',
  'What makes you feel most loved?', 'Describe our relationship in three emojis.', 'What would our perfect lazy Sunday look like?',
  'What did you think about today?', 'Which food would you feed me forever?', 'What should our couple nickname be?',
  'What are you proud of me for?', 'If we had a pet, what would we name it?', 'What is your love language?',
  'What is the cutest thing I ever said?', 'Morning cuddles or night cuddles?', 'Where do you see us in five years?',
  'What is one dream you have not told me?', 'Which movie couple are we?', 'What do you miss most when we are apart?',
  'What should we celebrate this month?', 'What is something that always makes you smile?', 'What was our best date so far?',
  'Pick our next date: picnic, movie or long drive?', 'What do you want more of from me?', 'Which outfit of mine is your favourite?',
  'What did I do recently that made you happy?', 'If today had a colour, what would it be?', 'Tell me one secret wish 🤫',
];

export const PERIOD_KIT = ['Pads or tampons', 'Heat pad', 'Painkillers', 'Dark chocolate', 'Comfy pyjamas', 'Hot water bottle', 'Tea bags', 'Face mask', 'Snacks stash', 'Spare undies'];

export const BLOOP_OUTFITS = [
  ['none', 'Just Bloop', 0], ['bow', 'Pink bow', 0], ['flowers', 'Flower crown', 3],
  ['bunny', 'Bunny ears', 7], ['hoodie', 'Hoodie', 14], ['crown', 'Princess crown', 30],
];

export const THEMES = {
  strawberry: { name: 'Strawberry Milk', dark: false, bg: '#FFF4F7', surface: '#FFFFFF', soft: '#FFE1EB', ink: '#5A1F33', muted: '#A2687C', primary: '#FF5C8A', accent: '#E8174F', blob: '#FF8FB1' },
  cherrymoon: { name: 'Cherry Moon', dark: true, bg: '#1E0F1A', surface: '#2D1527', soft: '#3E1D35', ink: '#FFE1EB', muted: '#C79AB0', primary: '#FF6F9C', accent: '#FF2E63', blob: '#FF8FB1' },
  peach: { name: 'Peach Mochi', dark: false, bg: '#FFF6EE', surface: '#FFFFFF', soft: '#FFE4D2', ink: '#5E2E1E', muted: '#B07B63', primary: '#FF9472', accent: '#F2613F', blob: '#FFB197' },
  lavender: { name: 'Lavender Dream', dark: false, bg: '#F8F4FF', surface: '#FFFFFF', soft: '#EAE0FF', ink: '#3A2560', muted: '#8C77B5', primary: '#A07CFF', accent: '#7B4DFF', blob: '#C5AEFF' },
  sakura: { name: 'Sakura', dark: false, bg: '#FFF7F9', surface: '#FFFFFF', soft: '#FDE2EA', ink: '#4F2433', muted: '#B0808F', primary: '#F48FB1', accent: '#D94F7E', blob: '#F9B6CB' },
  cottoncandy: { name: 'Cotton Candy', dark: false, bg: '#F3FAFF', surface: '#FFFFFF', soft: '#FFE3F1', ink: '#3B2A55', muted: '#8E85AE', primary: '#FF7EB9', accent: '#5CC8FF', blob: '#FF9ECD' },
  midnightrose: { name: 'Midnight Rose', dark: true, bg: '#14101C', surface: '#221A2E', soft: '#33263F', ink: '#F7E3EE', muted: '#B39CB8', primary: '#E85D8F', accent: '#C2185B', blob: '#E87AA4' },
  vanilla: { name: 'Vanilla Latte', dark: false, bg: '#FBF6EF', surface: '#FFFFFF', soft: '#F3E6D6', ink: '#4A3426', muted: '#A08670', primary: '#D98E73', accent: '#B5654B', blob: '#EBB39C' },
};

export const COUPON_IDEAS = ['1 free massage 💆‍♀️', 'You pick the movie 🎬', 'Breakfast in bed 🥞', 'One "I\'m right" card 😌', 'Shopping date 🛍️', 'Long drive + playlist 🚗', 'No-phone date night 📵', 'Ice cream run 🍦'];
